import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import maplibregl from "maplibre-gl";

import {
  TEMPERATURE_PROFILE_COLORS,
  TEMPERATURE_PROFILE_RADIUS_METERS,
} from "../../domain/temperatureProfile";


const VERTICAL_SCALE = 5;
const HEIGHT_LABEL_STEP_METERS = 200;
const SINGLE_LEVEL_RENDER_HEIGHT_METERS = 100;
const INVERSION_CONTOUR_COLOR = 0x9f2f2f;
const overlayByMap = new WeakMap();

function temperatureColor(value, min, max) {
  const span = max - min;
  const normalized = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0.5;
  const scaled = normalized * (TEMPERATURE_PROFILE_COLORS.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(lowerIndex + 1, TEMPERATURE_PROFILE_COLORS.length - 1);
  return new THREE.Color(TEMPERATURE_PROFILE_COLORS[lowerIndex]).lerp(
    new THREE.Color(TEMPERATURE_PROFILE_COLORS[upperIndex]),
    scaled - lowerIndex
  );
}

function addHeightMarks(group, heights, opacity) {
  if (!heights.length) {
    return;
  }
  const points = [];
  heights.forEach((height) => {
    const renderedHeight = height * VERTICAL_SCALE;
    for (let index = 0; index < 48; index += 1) {
      const firstAngle = index / 48 * Math.PI * 2;
      const secondAngle = (index + 1) / 48 * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(firstAngle) * TEMPERATURE_PROFILE_RADIUS_METERS,
          Math.sin(firstAngle) * TEMPERATURE_PROFILE_RADIUS_METERS,
          renderedHeight
        ),
        new THREE.Vector3(
          Math.cos(secondAngle) * TEMPERATURE_PROFILE_RADIUS_METERS,
          Math.sin(secondAngle) * TEMPERATURE_PROFILE_RADIUS_METERS,
          renderedHeight
        )
      );
    }
  });
  const marks = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity, transparent: true, depthTest: false })
  );
  marks.renderOrder = 10;
  group.add(marks);
}

function createHeightLabels(station) {
  const levels = station.levels
    .filter((level) => Number.isFinite(level.height) && Number.isFinite(level.temperature))
    .sort((first, second) => first.height - second.height);
  if (!levels.length) {
    return [];
  }
  const maxHeight = levels.at(-1).height;
  const markedHeights = levels
    .map((level) => level.height)
    .filter((height) => height === 0 || height === maxHeight || height % HEIGHT_LABEL_STEP_METERS === 0);
  const origin = maplibregl.MercatorCoordinate.fromLngLat([station.longitude, station.latitude], 0);
  const meterScale = origin.meterInMercatorCoordinateUnits();
  return [...new Set(markedHeights)].map((height) => ({
    text: `${height.toLocaleString("ru-RU")} м`,
    positions: Array.from({ length: 32 }, (_, index) => {
      const angle = index / 32 * Math.PI * 2;
      return new THREE.Vector4(
        origin.x + Math.cos(angle) * TEMPERATURE_PROFILE_RADIUS_METERS * 1.06 * meterScale,
        origin.y + Math.sin(angle) * TEMPERATURE_PROFILE_RADIUS_METERS * 1.06 * meterScale,
        height * VERTICAL_SCALE * meterScale,
        1
      );
    }),
  }));
}

function setGeometryColor(geometry, color) {
  const colors = new Float32Array(geometry.getAttribute("position").count * 3);
  for (let index = 0; index < colors.length; index += 3) {
    colors[index] = color.r;
    colors[index + 1] = color.g;
    colors[index + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function addStationProfile(scene, station, minTemperature, maxTemperature) {
  const measuredLevels = station.levels
    .filter((level) => Number.isFinite(level.height) && Number.isFinite(level.temperature))
    .sort((first, second) => first.height - second.height);
  if (!measuredLevels.length) {
    return;
  }
  const levels = measuredLevels.length === 1
    ? [
        measuredLevels[0],
        {
          height: measuredLevels[0].height + SINGLE_LEVEL_RENDER_HEIGHT_METERS,
          temperature: measuredLevels[0].temperature,
        },
      ]
    : measuredLevels;

  const origin = maplibregl.MercatorCoordinate.fromLngLat([station.longitude, station.latitude], 0);
  const meterScale = origin.meterInMercatorCoordinateUnits();
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.matrix
    .makeTranslation(origin.x, origin.y, origin.z)
    .scale(new THREE.Vector3(meterScale, -meterScale, meterScale));
  scene.add(group);

  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
  unitCylinder.rotateX(Math.PI / 2);
  const segmentGeometries = [];
  const capGeometries = [];

  for (let index = 0; index < levels.length - 1; index += 1) {
    const lower = levels[index];
    const upper = levels[index + 1];
    if (upper.height <= lower.height) {
      continue;
    }
    const segmentHeight = (upper.height - lower.height) * VERTICAL_SCALE;
    const temperature = (lower.temperature + upper.temperature) / 2;
    const geometry = unitCylinder.clone();
    geometry.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(0, 0, lower.height * VERTICAL_SCALE + segmentHeight / 2),
      new THREE.Quaternion(),
      new THREE.Vector3(TEMPERATURE_PROFILE_RADIUS_METERS, TEMPERATURE_PROFILE_RADIUS_METERS, segmentHeight)
    ));
    setGeometryColor(
      geometry,
      temperatureColor(temperature, minTemperature, maxTemperature)
    );
    segmentGeometries.push(geometry);
  }
  unitCylinder.dispose();

  [levels[0], levels.at(-1)].forEach((level) => {
    const capGeometry = new THREE.CircleGeometry(TEMPERATURE_PROFILE_RADIUS_METERS, 48);
    capGeometry.translate(0, 0, level.height * VERTICAL_SCALE);
    setGeometryColor(capGeometry, temperatureColor(level.temperature, minTemperature, maxTemperature));
    capGeometries.push(capGeometry);
  });

  const profileGeometry = mergeGeometries(segmentGeometries, false);
  segmentGeometries.forEach((geometry) => geometry.dispose());
  if (profileGeometry) {
    const outerProfile = new THREE.Mesh(
      profileGeometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        opacity: 0.9,
        transparent: true,
        depthWrite: true,
        side: THREE.BackSide,
      })
    );
    outerProfile.renderOrder = 1;
    group.add(outerProfile);

    const innerProfile = new THREE.Mesh(
      profileGeometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        opacity: 0.9,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      })
    );
    innerProfile.renderOrder = 2;
    group.add(innerProfile);
  }

  const capsGeometry = mergeGeometries(capGeometries, false);
  capGeometries.forEach((geometry) => geometry.dispose());
  if (capsGeometry) {
    const caps = new THREE.Mesh(
      capsGeometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        opacity: 0.45,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    caps.renderOrder = 3;
    group.add(caps);
  }

  const maxHeight = levels.at(-1).height;
  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, maxHeight * VERTICAL_SCALE),
    ]),
    new THREE.LineBasicMaterial({ color: 0x173b57, opacity: 0.95, transparent: true, depthTest: false })
  );
  axis.renderOrder = 11;
  group.add(axis);

  const inversion = station.device_type === "profile" ? station.inversion : null;
  if (
    Number.isFinite(inversion?.power) &&
    inversion.power > 0 &&
    Number.isFinite(inversion?.lower) &&
    Number.isFinite(inversion?.upper) &&
    inversion.upper > inversion.lower
  ) {
    [inversion.lower, inversion.upper].forEach((height) => {
      const contour = new THREE.Mesh(
        new THREE.TorusGeometry(TEMPERATURE_PROFILE_RADIUS_METERS * 1.01, 30, 6, 96),
        new THREE.MeshBasicMaterial({
          color: INVERSION_CONTOUR_COLOR,
          depthTest: false,
          opacity: 1,
          transparent: true,
        })
      );
      contour.position.z = height * VERTICAL_SCALE;
      contour.renderOrder = 12;
      group.add(contour);
    });
  }

  const markedHeights = [...new Set(levels.map((level) => level.height))];
  const labeledHeights = markedHeights.filter(
    (height) => height === 0 || height === maxHeight || height % HEIGHT_LABEL_STEP_METERS === 0
  );
  const labeledHeightSet = new Set(labeledHeights);
  const edgeHeights = labeledHeights.filter((height) => height === 0 || height === maxHeight);
  const interiorLabeledHeights = labeledHeights.filter((height) => height !== 0 && height !== maxHeight);
  addHeightMarks(group, markedHeights.filter((height) => !labeledHeightSet.has(height)), 0.28);
  addHeightMarks(group, interiorLabeledHeights, 0.82);
  addHeightMarks(group, edgeHeights, 0.42);
}

function clearScene(scene) {
  for (const object of [...scene.children]) {
    scene.remove(object);
    object.traverse((child) => {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.filter(Boolean).forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    });
  }
}

function createOverlay(map) {
  const overlay = {
    frame: null,
    map,
    camera: new THREE.Camera(),
    scene: new THREE.Scene(),
    labels: [],
    setFrame(frame) {
      this.frame = frame;
      clearScene(this.scene);
      this.labelLayer.replaceChildren();
      this.labels = [];
      if (frame && Number.isFinite(frame.min_temperature) && Number.isFinite(frame.max_temperature)) {
        frame.stations.forEach((station) => {
          addStationProfile(this.scene, station, frame.min_temperature, frame.max_temperature);
          createHeightLabels(station).forEach((label) => {
            const element = document.createElement("span");
            element.textContent = label.text;
            element.className = "temperature-profile-height-label";
            this.labelLayer.appendChild(element);
            this.labels.push({ ...label, element });
          });
        });
      }
      this.map.triggerRepaint();
    },
    render() {
      const mapCanvas = this.map.getCanvas();
      if (
        this.canvas.width !== mapCanvas.width ||
        this.canvas.height !== mapCanvas.height
      ) {
        this.renderer.setSize(mapCanvas.clientWidth, mapCanvas.clientHeight, false);
      }
      const matrix = this.map.transform.customLayerMatrix();
      this.camera.projectionMatrix.fromArray(matrix);
      this.renderer.render(this.scene, this.camera);
      const projected = new THREE.Vector4();
      const occupiedLabelBounds = [];
      this.labels.forEach(({ element, positions }) => {
        let rightmostX = -Infinity;
        let rightmostY = 0;
        positions.forEach((position) => {
          projected.copy(position).applyMatrix4(this.camera.projectionMatrix);
          if (projected.w <= 0) {
            return;
          }
          const x = (projected.x / projected.w + 1) * this.canvas.clientWidth / 2;
          if (x > rightmostX) {
            rightmostX = x;
            rightmostY = (1 - projected.y / projected.w) * this.canvas.clientHeight / 2;
          }
        });
        if (!Number.isFinite(rightmostX)) {
          element.style.visibility = "hidden";
          return;
        }
        const x = rightmostX + 7;
        const y = rightmostY;
        const bounds = {
          left: x - 18,
          right: x + element.offsetWidth + 4,
          top: y - element.offsetHeight / 2 - 3,
          bottom: y + element.offsetHeight / 2 + 3,
        };
        const overlaps = occupiedLabelBounds.some((occupied) => (
          bounds.left < occupied.right &&
          bounds.right > occupied.left &&
          bounds.top < occupied.bottom &&
          bounds.bottom > occupied.top
        ));
        const isHidden =
          x < 0 ||
          bounds.right > this.canvas.clientWidth ||
          bounds.top < 0 ||
          bounds.bottom > this.canvas.clientHeight ||
          overlaps;
        element.style.visibility = isHidden ? "hidden" : "visible";
        if (isHidden) {
          return;
        }
        element.style.transform = `translate(0, -50%) translate(${x}px, ${y}px)`;
        occupiedLabelBounds.push(bounds);
      });
    },
    remove() {
      this.map.off("render", this.render);
      clearScene(this.scene);
      this.renderer.dispose();
      this.canvas.remove();
      this.labelLayer.remove();
    },
  };

  overlay.canvas = document.createElement("canvas");
  overlay.canvas.className = "temperature-profile-canvas";
  map.getCanvasContainer().appendChild(overlay.canvas);
  overlay.labelLayer = document.createElement("div");
  overlay.labelLayer.className = "temperature-profile-label-layer";
  map.getCanvasContainer().appendChild(overlay.labelLayer);
  overlay.renderer = new THREE.WebGLRenderer({ canvas: overlay.canvas, antialias: true, alpha: true });
  overlay.renderer.setPixelRatio(window.devicePixelRatio);
  overlay.renderer.setSize(map.getCanvas().clientWidth, map.getCanvas().clientHeight, false);
  overlay.renderer.setClearColor(0x000000, 0);
  overlay.render = overlay.render.bind(overlay);
  map.on("render", overlay.render);
  return overlay;
}

export function updateTemperatureProfileLayer(map, frame, enabled) {
  let overlay = overlayByMap.get(map);
  if (!enabled || !frame) {
    if (overlay) {
      overlay.remove();
      overlayByMap.delete(map);
    }
    return;
  }
  if (!overlay) {
    overlay = createOverlay(map);
    overlayByMap.set(map, overlay);
  }
  overlay.setFrame(frame);
}

export function removeTemperatureProfileLayer(map) {
  const overlay = overlayByMap.get(map);
  if (overlay) {
    overlay.remove();
    overlayByMap.delete(map);
  }
}
