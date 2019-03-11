import * as _ from "lodash";
import * as Serverless from "serverless";

import * as layerArns from "./layers";

export class IOpipeLayerPlugin {
  public serverless: Serverless;
  public options: Serverless.Options;
  public hooks: {
    [event: string]: Promise<any>;
  };

  constructor(serverless: Serverless, options: Serverless.Options) {
    this.serverless = serverless;

    this.options = options;

    this.hooks = {
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

  private addLayer(funcName: string, funcDef: any) {
    this.serverless.cli.log(`Adding IOpipe layer to ${funcName}`);

    const region = _.get(this.serverless.service, "provider.region");
    if (!region) {
      this.serverless.cli.log(
        "No AWS region specified for IOpipe layer, skipping"
      );
      return;
    }

    const {
      environment = {},
      handler,
      runtime = _.get(this.serverless.service, "provider.runtime"),
      layers = []
    } = funcDef;

    if (!this.config.token && !environment.IOPIPE_TOKEN) {
      this.serverless.cli.log(
        `No IOpipe token specified for "${funcName}", skipping`
      );
      return;
    }

    const iopipeLayers = layers.filter(
      layer => typeof layer === "string" && layer.match("146318645305")
    );

    if (iopipeLayers.length) {
      this.serverless.cli.log(
        `Function "${funcName}" already specifies an IOpipe layer, skipping`
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
        `Unsupported runtime "${runtime}" for Iopipe layer, skipping`
      );
      return;
    }

    layers.push(this.getLayerArn(runtime, region));
    funcDef.layers = layers;

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

    this.serverless.cli.log(`${JSON.stringify(funcDef)}`);
  }

  private getLayerArn(runtime: string, region: string) {
    return _.chain(layerArns)
      .get(runtime)
      .get(region)
      .value();
  }

  private getHandlerWrapper(runtime: string, handler: string) {
    if (runtime.match("nodejs")) {
      return "@iopipe/iopipe.handler";
    }

    if (runtime.match("python")) {
      return "iopipe.handler.wrapper";
    }

    return handler;
  }
}

module.exports = IOpipeLayerPlugin;
