#!/usr/bin/env sh
CONFIGMAP_FILE="chart/configmap-extra.yaml"
# download transfer image and save chart content
docker pull $TRANSFER_IMAGE

containername="transfer-${BUILD_NUMBER:-$RANDOM}"
docker run --name ${containername} ${TRANSFER_IMAGE} /bin/true || true
docker cp ${containername}:/scripts .
docker cp ${containername}:/deployments .
if [ -f "$CONFIGMAP_FILE" ]; then
  cp "$CONFIGMAP_FILE" deployments/charts/atp3-playwright-runner/templates
fi
mv deployments/charts/atp3-playwright-runner deployments/charts/$APPLICATION_NAME
sed -i "s/^name: atp3-playwright-runner$/name: $APPLICATION_NAME/" deployments/charts/$APPLICATION_NAME/Chart.yaml
docker stop ${containername}
docker rm ${containername}

mkdir -p helm-templates/$APPLICATION_NAME
cp -R ./deployments/charts/$APPLICATION_NAME/* helm-templates/$APPLICATION_NAME

for docker_image_name in ${DOCKER_NAMES}; do
  DOCKER_BUILDKIT=1 docker build \
    --build-arg HTTP_FTP_PROJECTS=${HTTP_FTP_PROJECTS} \
    --pull \
    -t ${docker_image_name} \
    .
done

