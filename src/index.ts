import * as fs from "fs-extra";
import * as path from "path";

import * as _ from "lodash";
import * as Serverless from "serverless";

import * as layerArns from "./layers";

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

  public run() {
    const funcs = this.functions;

    Object.keys(funcs).forEach(funcName => {
      const funcDef = funcs[funcName];
      this.addLayer(funcName, funcDef);
    });
  }
  public cleanup() {
    this.removeNodeHelper();
  }

  private addLayer(funcName: string, funcDef: any) {
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

    const layerArn = this.getLayerArn(runtime, region);
    const iopipeLayers = layers.filter(
      layer => typeof layer === "string" && layer.match(layerArn)
    );

    if (iopipeLayers.length) {
      this.serverless.cli.log(
        `Function "${funcName}" already specifies an IOpipe layer; skipping.`
      );
    } else {
      layers.push(layerArn);
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

  private getLayerArn(runtime: string, region: string) {
    return _.chain(layerArns)
      .get(runtime)
      .get(region)
      .value();
  }

  private getHandlerWrapper(runtime: string, handler: string) {
    if (runtime.match("nodejs")) {
      this.addNodeHelper();
      return "iopipe_wrapper.handler";
    }

    if (runtime.match("python")) {
      return "iopipe.handler.wrapper";
    }

    return handler;
  }

  private addNodeHelper() {
    const helperPath = path.join(
      this.serverless.config.servicePath,
      "iopipe_wrapper.js"
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
      "iopipe_wrapper.js"
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
    exclude.push("!iopipe_wrapper.js");
    pkg.exclude = exclude;

    return pkg;
  }
}

module.exports = IOpipeLayerPlugin;
