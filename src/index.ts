import * as fs from "fs-extra";
import * as path from "path";
import * as util from "util";

import * as _ from "lodash";
import * as request from "request"
import * as semver from "semver";
import * as Serverless from "serverless";


export default class IOpipeLayerPlugin {
  public serverless: Serverless;
  public options: Serverless.Options;
  public hooks: {
    [event: string]: Promise<any>;
  };

  constructor(serverless: Serverless, options: Serverless.Options) {
    this.serverless = serverless;

    this.options = options;

    this.hooks = {
      "after:deploy:function:packageFunction": this.cleanup.bind(this),
      "after:package:createDeploymentArtifacts": this.cleanup.bind(this),
      "before:deploy:function:packageFunction": this.run.bind(this),
      "before:package:createDeploymentArtifacts": this.run.bind(this)
    };
  }

  get config() {
    return _.get(this.serverless, "service.custom.iopipe", {});
  }

  get functions() {
    return Object.assign.apply(
      null,
      this.serverless.service
        .getAllFunctions()
        .map(func => ({ [func]: this.serverless.service.getFunction(func) }))
    );
  }

  public async run() {
    const version = this.serverless.getVersion();

    if (semver.lt(version, "1.34.0")) {
      this.serverless.cli.log(
        `Serverless ${version} does not support layers. Please upgrade to >=1.34.0.`
      );
      return;
    }

    const plugins = _.get(this.serverless, "service.plugins", []);

    this.serverless.cli.log(`Plugins: ${JSON.stringify(plugins)}`);

    if (
      plugins.indexOf("serverless-webpack") >
      plugins.indexOf("serverless-iopipe-layers")
    ) {
      this.serverless.cli.log(
        "serverless-iopipe-layers plugin must come after serverless-webpack in serverless.yml; skipping."
      );
      return;
    }

    const funcs = this.functions;

    Object.keys(funcs).forEach(async funcName => {
      const funcDef = funcs[funcName];
      await this.addLayer(funcName, funcDef);
    });
  }

  public cleanup() {
    this.removeNodeHelper();
  }

  private async addLayer(funcName: string, funcDef: any) {
    this.serverless.cli.log(`Adding IOpipe layer to ${funcName}`);

    const region = _.get(this.serverless.service, "provider.region");
    if (!region) {
      this.serverless.cli.log(
        "No AWS region specified for IOpipe layer; skipping."
      );
      return;
    }

    const {
      environment = {},
      handler,
      runtime = _.get(this.serverless.service, "provider.runtime"),
      layers = [],
      package: pkg = {}
    } = funcDef;

    if (!this.config.token && !environment.IOPIPE_TOKEN) {
      this.serverless.cli.log(
        `No IOpipe token specified for "${funcName}"; skipping.`
      );
      return;
    }

    if (
      typeof runtime !== "string" ||
      [
        "nodejs10.x",
        "nodejs6.10",
        "nodejs8.10",
        "python2.7",
        "python3.6",
        "python3.7"
      ].indexOf(runtime) === -1
    ) {
      this.serverless.cli.log(
        `Unsupported runtime "${runtime}" for Iopipe layer; skipping.`
      );
      return;
    }

    const { exclude = [] } = this.config;
    if (_.isArray(exclude) && exclude.indexOf(funcName) !== -1) {
      this.serverless.cli.log(`Excluded function ${funcName}; skipping`);
      return;
    }

    const layerArn = await this.getLayerArn(runtime, region);
    const iopipeLayers = layers.filter(
      layer => typeof layer === "string" && layer.match(layerArn)
    );

    if (iopipeLayers.length) {
      this.serverless.cli.log(
        `Function "${funcName}" already specifies an IOpipe layer; skipping.`
      );
    } else {
      if (typeof this.config.prepend === "boolean" && this.config.prepend) {
        layers.unshift(layerArn);
      } else {
        layers.push(layerArn);
      }
      funcDef.layers = layers;
    }

    environment.IOPIPE_HANDLER = handler;
    environment.IOPIPE_DEBUG =
      typeof environment.IOPIPE_DEBUG !== "undefined"
        ? environment.IOPIPE_DEBUG
        : this.config.debug || false;
    environment.IOPIPE_TOKEN = environment.IOPIPE_TOKEN
      ? environment.IOPIPE_TOKEN
      : this.config.token;
    funcDef.environment = environment;

    funcDef.handler = this.getHandlerWrapper(runtime, handler);
    funcDef.package = this.updatePackageExcludes(runtime, pkg);
  }

  private async getLayerArn(runtime: string, region: string) {
    return util.promisify(request)(`https://${region}.layers.iopipe.com/get-layers?CompatibleRuntime=${runtime}`).then(
      (response) => {
        const awsResp = JSON.parse(response.body)
        return _.get(awsResp, "Layers[0].LatestMatchingVersion.LayerVersionArn")
      }
    )
  }

  private getHandlerWrapper(runtime: string, handler: string) {
    if (
      ["nodejs6.10", "nodejs8.10"].indexOf(runtime) !== -1 ||
      (runtime === "nodejs10.x" &&
        _.get(this.serverless, "enterpriseEnabled", false))
    ) {
      this.addNodeHelper();
      return "iopipe-wrapper.handler";
    }

    if (runtime === "nodejs10.x") {
      return "/opt/nodejs/node_modules/@iopipe/iopipe.handler";
    }

    if (runtime.match("python")) {
      return "iopipe.handler.wrapper";
    }

    return handler;
  }

  private addNodeHelper() {
    const helperPath = path.join(
      this.serverless.config.servicePath,
      "iopipe-wrapper.js"
    );
    if (!fs.existsSync(helperPath)) {
      fs.writeFileSync(
        helperPath,
        "module.exports = require('@iopipe/iopipe');"
      );
    }
  }

  private removeNodeHelper() {
    const helperPath = path.join(
      this.serverless.config.servicePath,
      "iopipe-wrapper.js"
    );

    if (fs.existsSync(helperPath)) {
      fs.removeSync(helperPath);
    }
  }

  private updatePackageExcludes(runtime: string, pkg: any) {
    if (!runtime.match("nodejs")) {
      return pkg;
    }

    const { exclude = [] } = pkg;
    exclude.push("!iopipe-wrapper.js");
    pkg.exclude = exclude;

    return pkg;
  }
}

module.exports = IOpipeLayerPlugin;
