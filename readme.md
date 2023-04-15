# 地图瓦片下载器

> 使用nodejs下载地图瓦片数据的工具，可指定数据源、下载范围、下载层级。
## 基本使用
```
npm install

node index.js --region=119.071877,25.42451,119.918152,25.789433 --source='https://xxx.com/[x]/[y]/[z]' --max=18
```

## 数据源参考
Google 卫星图像
- 国外 https://mts1.google.com/vt/lyrs=s&hl=zh-CN&x=[x]&y=[y]&z=[z]
- 国内 https://gac-geo.googlecnapps.cn/maps/vt?lyrs=s&x=[x]&y=[y]&z=[z]

Mapbox
- 高程图 https://api.mapbox.com/v4/mapbox.terrain-rgb/[z]/[x]/[y].png?access_token=密钥
- 卫星图 https://api.mapbox.com/v4/mapbox.satellite/[z]/[x]/[y].jpg?access_token=密钥

Maptiler
- https://cloud.maptiler.com/maps/

## 参数说明
```
  -s, --source    http://somesource.com/[x]/[y]/[z]
  -o, --output    文件输出路径，默认值: "./tiles"
      --max       最大层级，默认值: 20
  -r, --region    下载范围: "lon,lat,lon,lat" (左下角,右上角)
  -t, --thread    线程数量，默认值: 8
      --fileName  保存文件名，默认值: "map.jpg"
  -f, --force     是否覆盖已有同名文件，默认跳过
  -h, --help      显示帮助信息
  -v, --version   显示版本号
```