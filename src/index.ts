import * as Serverless from "serverless";

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

  get functions() {
    return this.serverless.service
      .getAllFunctions()
      .map(func => this.serverless.service.getFunction(func));
  }

  public run() {
    this.functions.forEach(func => {
      const { runtime, layers = [] } = func as any;
      this.addLayer(runtime, layers);
      this.serverless.cli.log(`${JSON.stringify(func)}`);
    });
  }

  private addLayer(runtime: string, layers: string[]) {
    layers.push("arn:foo:bar");
  }
}

module.exports = IOpipeLayerPlugin;
