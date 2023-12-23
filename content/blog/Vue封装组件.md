---
external: false
title: "Vue封装组件"
description: About Vue responsiveness principle.
date: 2023-11-20
---

## 写在前面

在开发 Vue3 等现代框架项目时，我们有时候会针对现有的 UI 库二次封装或者自己封装组件，下面是本人在实践中的一些经验和看法。

## 受控与非受控

对于设计组件，有一个比较著名的概念：“受控组件”。对于任何组件化开发的框架来说，其实都可以通过这个概念来思考基础组件的设计。

### 受控模式

数据从外部传入，且由外部维护此组件的状态，组件内部不维护状态。

### 非受控模式

指使用者不需要关心控制组件的状体，完全交由组件内部维护组件的状态。

## 组件的封装

从我们常用的组件库的文档中可以知道，组件具有：属性、插槽、事件、方法四个特点
接下来介绍一下在 **Vue3（v3.3以上）** 中对这些特点的最佳实践

### 属性

场景：为my-input组件传入新的属性，并且还要传到el-input中

最佳实践：比起费劲地定义`props`，我们可以利用 Vue 中的属性透传`$attrs`

```ts
<my-input :size="inputSize" :clearable="clearable" />

<!--子组件-->
<template>
  <el-input v-bind="filteredAttrs"></el-input>
</template>
<script lang="ts" setup>
import { useAttrs, computed, ref } from 'vue'
import { ElInput } from 'element-plus'
// 该组件不自动继承父组件的属性
// defineOptions({
//   inheritAttrs: false
// })

const attrs = useAttrs()
// 过滤不想透传的属性
const filteredAttrs = computed(() => {
  return { ...attrs, class: undefined }
})
</script>

```

### 事件和方法

场景：需要继承第三方组件的Event以及方法，在父组件调用

最佳实践：同样通过透传，在第三方组件中传参`v-bind="$attrs"`，不需要向上抛出事件和方法，父组件就可以直接调用和注册组件内置的事件和方法

```ts
<!--子组件-->
<template>
  <div class="my-dialog">
    <el-button @click="dialogVisible = true">开</el-button>
    <el-dialog v-bind="$attrs" v-model="dialogVisible"></el-dialog>
  </div>
</template>
<script setup langs="ts">
import { ref } from 'vue'
import { ElButton, ElDialog } from 'element-plus' 
// 防止默认继承，需要应用在根节点以外的其他元素上时使用
defineOptions({
  inheritAttrs: false,
})
const dialogVisible = ref(false)
</script>

<!--父组件-->
<template>
  <div>
    <my-dialog
      @close="closeHandler"
      :before-close="beforeCloseHandler"
      title="你好"
    ></my-dialog>
  </div>
</template>
<script setup lang="ts">
import MyDialog from './components/MyDialog.vue'
import { ElMessageBox } from 'element-plus'
const closeHandler = () => {
  console.log('close')
}
const beforeCloseHandler = (done: () => void) => {
  ElMessageBox.confirm('是否关闭')
    .then(() => {
      console.log('close')
      done()
    })
    .catch(() => {
      console.log('cancel')
    })
}
</script>
```

### 插槽

场景：一般来说，二次封装组件时比较少会遇到需要添加插槽的情况，因为组件原本以及设计好了

最佳实践：在子组件中根据不同的插槽名称分类讨论，书写不同的UI区域

## Vue中的v-model

在业务中，我们常常会使用表单等组件，这时候要用到v-model。但是v-model在使用的过程中会踩一些坑。

1. 关于单项数据流的原则

Vue 的官方文档中说到：所有的props都遵循了**单向绑定**原则，props只随父组件的数据更新而更新，不能逆向传递。

比如这样封装一个组件，就会导致子组件直接更改了父组件的数据，违背了单项数据流原则

```ts
<!-- 父组件 -->
<my-input v-model="msg"></my-input>

<!-- 子组件 -->
<template>
  <el-input v-model="msg"></el-input>
</template>
<script setup lang="ts">
const props = defineProps({
  msg: {
    type: String,
    default: '',
  }
});
</script>
```

解决：
`将v-model拆分成传递值和传递事件，通过事件让父组件来修改`

```ts
<!-- 父组件 -->
<template>
  <my-input v-model="msg"></my-input>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const msg = ref('hello')
</script>

<!-- 子组件 -->
<template>
  <el-input 
    :modelValue="modelValue" 
    @update:modelValue="handleValueChange"
  >
  </el-input>
</template>
<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  }
});

const emit = defineEmits(['update:modelValue'])

// Vue3中实现了双向绑定的更新逻辑，事件名称就是update:value 所以不需要写逻辑，只需要传递事件名称即可
const handleValueChange = (value) => {
  emit('update:modelValue', value)
}
</script>
```

`通过使用Vue中计算属性的语法糖set，get来完成`

```ts
<!-- 父组件 -->
<template>
  <my-input v-model="msg"></my-input>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const msg = ref('hello')
</script>

<!-- 子组件 -->
<template>
  <el-input v-model="inputVal"></el-input>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  }
});

const emit = defineEmits(['update:modelValue']);

const inputVal = computed(() => {
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  }
})
</script>
```

2. 同时绑定一个对象中的多个v-model

```ts
<!-- 父组件 -->
<template>
  <my-input v-model="formList"></my-input>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const formList = ref({
  text: '',
  password: '',
  name: ''
})
</script>

<!-- 子组件 -->
<template>
    <el-input v-model="modelList.name"></el-input>
    <el-input v-model="modelList.text"></el-input>
    <el-input v-model="modelList.password"></el-input>
</template>
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => {},
  }
});

const emit = defineEmits(['update:modelValue']);

const modelList = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
    console.log("测试", modelList.value)
  }
})
</script>
```

这样看起来没什么问题，读取属性的时候能正常调用 get，但是设置属性的时候却无法触发 set，原因是 `modelList.value = xxx`，才会触发 set，而 `modelList.value.name = xxx`，无法触发。这个时候，Proxy 代理对象可以完美的解决这个问题：

具体的实现思路是：

get方法会返回一个新的Proxy对象，代理的目标就是`props[propsName]`，get方法中又套了一层get, set函数，当试图获取这个prop某个属性时，就会返回这个属性的值，当你设置他的值的时候，会触发更新事件，并更新值。

set方法用于设置prop的值，他直接触发更新事件，并更新值。

```ts
<script setup lang="ts">
const modelList = computed(() => {
  get() {
-   return props.modelValue 
+   return new Proxy(props.modelValue, {
+     get(target, key) {
+       return Reflect.get(target, key)
+     },
+     set(target, key, value) {
+       emit('update:modelValue', {
+         ...target,
+         [key]: value
+       })
+       return true
+     }
+   })
  },
  set(val) {
    emit('update:modelValue', val)
  }
})
</script>
```

写到这里，我们需要的双向绑定功能已经完成了，我们还可以简单封装一下这个方法。其实在vueuse中已经存在了这样的一个方法: `useVModel`，我们可以直接使用。

```js
export function useVModel(props, propsName, emit) {
  return computed({
    get() {
      return new Proxy(props[propsName], {
        get(target, key) {
          return Reflect.get(target, key)
        },
        set(target, key, value) {
          emit('update:' + propsName, {
            ...target,
            [key]: value
          })
          return true
        }
      })
    },
    set(val) {
      emit('update:' + propsName, val)
    }
  })
}
```
