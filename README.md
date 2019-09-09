# DEWHITE - 清除白色背景

> 作者：chzh314@hotmail.com

## 安装

```bash
  npm i dewhite --save
```

## 使用

```js
import dewhite from "dewhite";
//......
//ImageSrc是<img>标签的src属性可解析的字符串
dewhite(ImageSrc).then(ImageBlob => {
  const src = URL.createObjectURL(ImageBlob);
  img.src = src;
});
```
