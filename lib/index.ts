let threshold = 80;

class CanvasPool {
  poolDeep: number;
  canvasIndex: number;
  canvasPool: Array<HTMLCanvasElement>;
  ctxPool: Array<CanvasRenderingContext2D|null>;
  constructor(deep = 2) {
    this.poolDeep = deep > 1 ? deep : 1;
    this.canvasIndex = 0;
    this.canvasPool = [];
    for (let i: number = 0; i < this.poolDeep; i++) {
      this.canvasPool[i] = document.createElement("canvas");
    }
    this.ctxPool = this.canvasPool.map(
      (item): CanvasRenderingContext2D|null => {
        return item.getContext("2d");
      },
    );
  }
  set index(i: number) {
    this.canvasIndex = i % this.poolDeep;
  }
  get index(): number {
    return this.canvasIndex;
  }
  get canvas(): HTMLCanvasElement {
    return this.canvasPool[this.index];
  }
  get ctx(): CanvasRenderingContext2D|null {
    return this.ctxPool[this.index];
  }
}

function getImage(src: string) {
  const image: HTMLImageElement = new Image();
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.src = src;
    image.onload = () => resolve(image);
    image.onerror = () => reject();
  });
}
const _ = new CanvasPool();

export default function dewhite(
  imageSource: string,
  targetColor: Array<number> = [255, 255, 255],
): Promise<Blob|null> {
  return new Promise((resolve,reject) => {
    getImage(imageSource).then((img: HTMLImageElement) => {
      const { height, width }: { height: number; width: number } = img;
      _.index = 0;
      _.canvas.width = width;
      _.canvas.height = height;
      if(!_.ctx) {
        reject();
        return;
      }
      _.ctx.drawImage(img, 0, 0, width, height);
      const imageDataSource: ImageData = _.ctx.getImageData(
        0,
        0,
        width,
        height,
      );
      const imageData: Uint8ClampedArray = imageDataSource.data;
      const length: number = width * height;
      //遍历像素找到最大颜色距离
      let maxDis: number = 0;
      for (let i = 0; i < length; i += 10) {
        const rgba: Uint8ClampedArray = getPixByIndex(imageData, i);
        const pixDistance: number = getColorDistance(rgba, targetColor);
        if (pixDistance > maxDis) maxDis = pixDistance;
      }
      for (let i = 0; i < length; i++) {
        const rgba: Uint8ClampedArray = getPixByIndex(imageData, i);
        const pixDistance: number = getColorDistance(rgba, targetColor);
        if (pixDistance < threshold) {
          imageData[i * 4 + 0] = 255;
          imageData[i * 4 + 1] = 255;
          imageData[i * 4 + 2] = 255;
          imageData[i * 4 + 3] = 0;
        } else if (pixDistance < maxDis / 2) {
          imageData[i * 4 + 3] = (pixDistance / maxDis) * 255;
        }
      }

      for (let i = 0; i < length; i += 1) {
        const [r, g, b] = getPixByIndex(imageData, i);
        const [x, y] = getXYByIndex(i, width);
        const nearList = getNearMatrix(
          imageData,
          x,
          y,
          2,
          width,
          height,
          targetColor,
        );
        // eslint-disable-next-line no-loop-func
        nearList.forEach(item => {
          if (item.disNear < threshold && item.disTarget > threshold) {
            imageData[i * 4 + 0] = r;
            imageData[i * 4 + 1] = g;
            imageData[i * 4 + 2] = b;
            imageData[i * 4 + 3] = 255;
          }
        });
      }
      _.ctx.putImageData(imageDataSource, 0, 0);
      _.canvas.toBlob((blob: Blob | null) => {
        resolve(blob);
      });
    });
  });
}

const getPix = (
  imgData: Uint8ClampedArray,
  x: number = 0,
  y: number = 0,
  width: number,
): Uint8ClampedArray => {
  const start = getPixPropIndex(x, y, width);
  return imgData.slice(start, start + 4);
};
const getPixByIndex = (
  imgData: Uint8ClampedArray,
  index: number,
): Uint8ClampedArray => {
  return imgData.slice(index * 4, (index + 1) * 4);
};
const getPixPropIndex = (x: number, y: number, width: number): number => {
  return (y * width + x) * 4;
};
const getXYByIndex = (index: number, width: number): Array<number> => {
  const y: number = Math.ceil(index / width);
  const x: number = index - y * width;
  return [x, y];
};
const getColorDistance = (
  rgb: Uint8ClampedArray | Array<number>,
  target: Uint8ClampedArray | Array<number>,
): number => {
  const [r1, g1, b1] = rgb;
  const [r2, g2, b2] = target;
  return Math.sqrt(
    Math.pow(r1 - r2, 2) * 1 +
      Math.pow(g1 - g2, 2) * 1.15 +
      Math.pow(b1 - b2, 2) * 1.15,
  );
};
interface nearPix {
  pix: Uint8ClampedArray;
  disNear: number;
  disTarget: number;
}
const getNearMatrix = (
  imageData: Uint8ClampedArray,
  x: number,
  y: number,
  delta: number,
  width: number,
  height: number,
  targetColor: Uint8ClampedArray | Array<number>,
) => {
  const pixList: Array<nearPix> = [];
  const rgba: Uint8ClampedArray = getPix(imageData, x, y, width);
  let startX = x - delta;
  let endX = x + delta + 1;
  let startY = y - delta;
  let endY = y + delta + 1;
  if (startX < 0) startX = 0;
  if (endX > width) endX = width;
  if (startY < 0) startY = 0;
  if (endY > height) endY = height;
  for (let i = startX; i < endX; i++) {
    for (let j = startY; j < endY; j++) {
      if (i === x && j === y) continue;
      const pix: Uint8ClampedArray = getPix(imageData, i, j, width);
      const disNear: number = getColorDistance(pix, rgba);
      const disTarget: number = getColorDistance(pix, targetColor);
      pixList.push({ pix, disNear, disTarget });
    }
  }
  return pixList;
};
