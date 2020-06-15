# Command

* 正常编译

``` base
gio-rewired lib compile
```

* watch mode 的进行文件的编译

``` bash
gio-rewired lib compile --watch
```

* rough mode
粗暴模式，

``` bash
--rough
```

* output

``` bash
--es 输出 es 模块
--cjs 输出 commonJs 模块
```

## React Components Lib File Structure Rule

```` javascript
.
+-- src
|   +-- componentA
|       +-- style
|           +-- sub-component.less
|           +-- index.less
|           +-- index.ts // export all the component less file
|       +-- sub-component.tsx
|       +-- index.tsx // export component and sub component
|   +-- stylesheet
|   +-- index.ts // export all your components and types
|   +-- index.less // export all your components style into [package-name].css
+-- .gio-rewire.json
````

## React App File Structure Rule