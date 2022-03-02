# SimpleUserScriptLoader

通过直接向浏览器注入模拟的 GM API 使得一些 User Script 可以直接运行  
目前处于未完工状态，功能也没完整测试过  
由于同源限制，@resource 必须可以通过跨域获取，@require 直接通过 script 标签注入  
脚本不受 @grant 限制，因为全部 API 都会被注入到 window 下  
目前未判断@match  
无视 @run-at，脚本直接通过 eval 执行  
很多功能未实现，仅供练手

## build

```sh
tsc
```

## usage

```html
<script type="module">
    import { injectGM, suslMenu } from "./dist/susl.js"; // built susl code
    window.suslMenu = suslMenu;

    async function fetchCode(url) {
        const response = await fetch(url);
        const text = await response.text();
        return text;
    }

    (async () => {
        const code = await fetchCode("./example.js"); // user script code
        await injectGM(code);
        console.log("done!");
    })();
</script>
```
