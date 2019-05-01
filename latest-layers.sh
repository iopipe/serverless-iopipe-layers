#!/bin/bash -e

REGIONS=(
  ap-northeast-1
  ap-northeast-2
  ap-south-1
  ap-southeast-1
  ap-southeast-2
  ca-central-1
  eu-central-1
  eu-west-1
  eu-west-2
  eu-west-3
  #sa-east-1
  us-east-1
  us-east-2
  us-west-1
  us-west-2
)

echo "const layers = {"

echo "  \"nodejs6.10\": {"
for region in "${REGIONS[@]}"; do
    latest_arn=$(aws --region $region lambda list-layer-versions --layer-name IOpipeNodeJS610 --output text --query "LayerVersions[0].LayerVersionArn")
    echo "    \"${region}\": \"${latest_arn}\","
done
echo "  },"

echo "  \"nodejs8.10\": {"
for region in "${REGIONS[@]}"; do
    latest_arn=$(aws --region $region lambda list-layer-versions --layer-name IOpipeNodeJS810 --output text --query "LayerVersions[0].LayerVersionArn")
    echo "    \"${region}\": \"${latest_arn}\","
done
echo "  },"

echo "  \"python2.7\": {"
for region in "${REGIONS[@]}"; do
    latest_arn=$(aws --region $region lambda list-layer-versions --layer-name IOpipePython27 --output text --query "LayerVersions[0].LayerVersionArn")
    echo "    \"${region}\": \"${latest_arn}\","
done
echo "  },"

echo "  \"python3.6\": {"
for region in "${REGIONS[@]}"; do
    latest_arn=$(aws --region $region lambda list-layer-versions --layer-name IOpipePython --output text --query "LayerVersions[0].LayerVersionArn")
    echo "    \"${region}\": \"${latest_arn}\","
done
echo "  },"

echo "  \"python3.7\": {"
for region in "${REGIONS[@]}"; do
    latest_arn=$(aws --region $region lambda list-layer-versions --layer-name IOpipePython --output text --query "LayerVersions[0].LayerVersionArn")
    echo "    \"${region}\": \"${latest_arn}\","
done
echo "  }"

echo "};"

echo ""
echo "export default layers;"
echo ""
echo "module.exports = layers;"
