# serverless-iopipe-layers

A [Serverless](https://serverless.com) plugin to add [IOpipe](https://www.iopipe.com)
observability using [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html) without requiring a code change.

## Features

* Supports Node.js and Python runtimes (more runtimes to come)
* No code change required to enable IOpipe
* Bundles all of IOpipe's observability plugins in a single layer

## Install

With NPM:

```bash
npm install --save-dev serverless-iopipe-layers
```

With yarn:

```bash
yarn add --dev serverless-iopipe-layers
```

Add the plugin to your `serverless.yml`:

```yaml
plugins:
  - serverless-iopipe-layers
```

Get a [free IOpipe token](https://dashboard.iopipe.com/install) and plug it into your `serverless.yml`:

```yaml
custom:
  iopipe:
      token: your-iopipe-token-here
```

Deploy and you're all set.

## Usage

This plugin wraps your handlers without requiring a code change. If you're currently
using IOpipe, you can remove the wrapping code you currently have and this plugin will
do it for you automatically.

## Config

The following config options are available via the `iopipe` section of the `custom` section of your `serverless.yml`:

#### `token` (required)

The IOpipe token to use.

#### `debug` (optional)

Whether or not to enable debug mode. Must be a boolean value.

```yaml
config:
  iopipe:
    debug: true
```

#### `exclude` (optional)

An array of functions to exclude from automatic wrapping.

```yaml
config:
  iopipe:
    exclude:
      - excluded-func-1
      - another-excluded-func
```


## Supported Runtimes

This plugin currently supports the following AWS runtimes:

* nodejs6.10
* nodejs8.10
* python2.7
* python3.6
* python3.7

## Limitations

* Doesn't currently support local invocation

## License

Apache 2.0