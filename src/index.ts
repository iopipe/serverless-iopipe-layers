import * as Serverless from "serverless";

export class IOpipeLayerPlugin {
  public serverless: Serverless;
  public options: Serverless.Options;
  public hooks: {
        [event: string]: Promise<any>;
    };

	constructor(serverless: Serverless , options: Serverless.Options) {
this.serverless = serverless;
this.options = options;
    }
}
