let threshold = 80;
class CanvasPool {
    constructor(deep = 2) {
        this.poolDeep = deep > 1 ? deep : 1;
        this.canvasIndex = 0;
        this.canvasPool = [];
        for (let i = 0; i < this.poolDeep; i++) {
            this.canvasPool[i] = document.createElement("canvas");
        }
        this.ctxPool = this.canvasPool.map((item) => {
            return item.getContext("2d");
        });
    }
    set index(i) {
        this.canvasIndex = i % this.poolDeep;
    }
    get index() {
        return this.canvasIndex;
    }
    get canvas() {
        return this.canvasPool[this.index];
    }
    get ctx() {
        return this.ctxPool[this.index];
    }
}
function getImage(src) {
    const image = new Image();
    return new Promise((resolve, reject) => {
        image.src = src;
        image.onload = () => resolve(image);
        image.onerror = () => reject();
    });
}
const _ = new CanvasPool();
export default function dewhite(imageSource, targetColor = [255, 255, 255]) {
    return new Promise((resolve, reject) => {
        getImage(imageSource).then((img) => {
            const { height, width } = img;
            _.index = 0;
            _.canvas.width = width;
            _.canvas.height = height;
            if (!_.ctx) {
                reject();
                return;
            }
            _.ctx.drawImage(img, 0, 0, width, height);
            const imageDataSource = _.ctx.getImageData(0, 0, width, height);
            const imageData = imageDataSource.data;
            const length = width * height;
            //遍历像素找到最大颜色距离
            let maxDis = 0;
            for (let i = 0; i < length; i += 10) {
                const rgba = getPixByIndex(imageData, i);
                const pixDistance = getColorDistance(rgba, targetColor);
                if (pixDistance > maxDis)
                    maxDis = pixDistance;
            }
            for (let i = 0; i < length; i++) {
                const rgba = getPixByIndex(imageData, i);
                const pixDistance = getColorDistance(rgba, targetColor);
                if (pixDistance < threshold) {
                    imageData[i * 4 + 0] = 255;
                    imageData[i * 4 + 1] = 255;
                    imageData[i * 4 + 2] = 255;
                    imageData[i * 4 + 3] = 0;
                }
                else if (pixDistance < maxDis / 2) {
                    imageData[i * 4 + 3] = (pixDistance / maxDis) * 255;
                }
            }
            for (let i = 0; i < length; i += 1) {
                const [r, g, b] = getPixByIndex(imageData, i);
                const [x, y] = getXYByIndex(i, width);
                const nearList = getNearMatrix(imageData, x, y, 2, width, height, targetColor);
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
            _.canvas.toBlob((blob) => {
                resolve(blob);
            });
        });
    });
}
const getPix = (imgData, x = 0, y = 0, width) => {
    const start = getPixPropIndex(x, y, width);
    return imgData.slice(start, start + 4);
};
const getPixByIndex = (imgData, index) => {
    return imgData.slice(index * 4, (index + 1) * 4);
};
const getPixPropIndex = (x, y, width) => {
    return (y * width + x) * 4;
};
const getXYByIndex = (index, width) => {
    const y = Math.ceil(index / width);
    const x = index - y * width;
    return [x, y];
};
const getColorDistance = (rgb, target) => {
    const [r1, g1, b1] = rgb;
    const [r2, g2, b2] = target;
    return Math.sqrt(Math.pow(r1 - r2, 2) * 1 +
        Math.pow(g1 - g2, 2) * 1.15 +
        Math.pow(b1 - b2, 2) * 1.15);
};
const getNearMatrix = (imageData, x, y, delta, width, height, targetColor) => {
    const pixList = [];
    const rgba = getPix(imageData, x, y, width);
    let startX = x - delta;
    let endX = x + delta + 1;
    let startY = y - delta;
    let endY = y + delta + 1;
    if (startX < 0)
        startX = 0;
    if (endX > width)
        endX = width;
    if (startY < 0)
        startY = 0;
    if (endY > height)
        endY = height;
    for (let i = startX; i < endX; i++) {
        for (let j = startY; j < endY; j++) {
            if (i === x && j === y)
                continue;
            const pix = getPix(imageData, i, j, width);
            const disNear = getColorDistance(pix, rgba);
            const disTarget = getColorDistance(pix, targetColor);
            pixList.push({ pix, disNear, disTarget });
        }
    }
    return pixList;
};
