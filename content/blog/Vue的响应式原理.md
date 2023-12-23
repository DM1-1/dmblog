---
external: false
title: "Vue的响应式原理"
description: This is a sharing about Vue encapsulated components.
date: 2023-11-20
---

## Vue响应式原理

### 副作用函数 与 响应式数据

这是理解Vue响应式原理的两个重要概念

- 副作用函数：在IO中，对其他数据产生副作用的函数（比如修改某些数据）
- 响应式数据：会引起视图变化的数据

### 响应式数据的实现

数据读取:getter
数据修改:setter

在Vue中的实现

- vue2-Object.defineProperty
- vue3-proxy

进行getter操作时，会把effect存储到桶里面
进行setter操作时，会把桶里面的effect全部执行

### 响应式系统

```js
const bucket = new WeakMap()
// 防止内存溢出，自动回收没有用到的key

let activeEffect = null
function effect(fn) {
  activeEffect = fn
  fn()
}

function track(target, key) {
  if(!activeEffect) {
    return
  }

  let depsMap = bucket.get(target)
  if(!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if(!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  return target[key]
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) {
    return
  }
  const effects = depsMap.get(key)
  effects && effects.forEach(fn => fn())  
}

const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, value) {
    target[key] = value
    trigger(target, key)
  },
})
```

### 分支切换与副作用函数依赖解绑

在 effectFn 函数内部存在一个三元表达式，根据字段 obj.ok 值的不同会执行不同的代码分支。当字段 obj.ok 的值发生变化时，代码执行的分支会跟着变化，这就是所谓的分支切换。

当obj.oj = false 时，obj.text 的副作用函数桶中没有删去 effectFn 函数，这不是我们想看到的结果

```js
const data = {
  text: 'helloWorld',
  ok: true,
}
let activeEffect
const bucket = new WeakMap() // 副作用函数的桶 使用WeakMap

function effect(fn) {
  const effectFn = () => {
    // 副作用函数执行之前，将该函数从其所在的依赖集合中删除
    cleanup(effectFn)
    // 当effectFn执行时，将其设置为当前激活的副作用函数
    activeEffect = effectFn
    fn()
  }
  effectFn.deps = [] // activeEffect.deps用来存储所有与该副作用函数相关联的依赖集合
  effectFn()
}

function cleanup(effectFn) {
  console.log('cleanup', effectFn.deps) // ++++
  for (let i = 0, len = effectFn.deps.length; i < len; i++) {
    let deps = effectFn.deps[i] // 依赖集合
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0 // 重置effectFn的deps数组
}

const obj = new Proxy(data, {
  get(target, p, receiver) {
    track(target, p)
    return target[p]
  },
  set(target, p, value, receiver) {
    target[p] = value
    trigger(target, p) // 把副作用函数取出并执行
    return true
  },
})

// track函数
function track(target, key) {
  console.log('get', target, key, 'push to activeEffect.deps') // ++++
  if (!activeEffect) return // 没有正在执行的副作用函数 直接返回
  let depsMap = bucket.get(target)
  if (!depsMap) {
    // 不存在，则创建一个Map
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key) // 根据key得到 depsSet(set类型), 里面存放了该 target-->key 对应的副作用函数
  if (!deps) {
    // 不存在，则创建一个Set
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect) // 将副作用函数加进去
  // deps就是当前副作用函数存在联系的依赖集合
  // 将其添加到activeEffect.deps数组中
  activeEffect.deps.push(deps)
}

// trigger函数
function trigger(target, key) {
  console.log('set', target, key, 'trigger the effectFn') // ++++
  const depsMap = bucket.get(target) // target Map
  if (!depsMap) return
  const effects = depsMap.get(key) // effectFn Set
  const effectToRun = new Set(effects) // 防止反复调用trigger函数
  effectToRun &&
    effectToRun.forEach(fn => {
      if (typeof fn === 'function') fn()
    })
}

let text = ''

effect(() => {
  console.log('effect run')
  text = obj.ok ? obj.text : 'no'
})

setTimeout(() => {
  obj.ok = false
}, 4000)

setTimeout(() => {
  obj.text = 'ds'
}, 1000)
```

### 关于嵌套effect和effect栈

当副作用函数是嵌套函数的时候，因为内层副作用函数后执行，于是全局的当前副作用函数就始终被内层副作用函数覆盖，导致外层副作用函数无法被收集到依赖集合中。

改进这点可以通过引入effect栈，将当前副作用函数存储到栈中，当内层副作用函数执行完毕后，再从栈中取出外层副作用函数，这样就可以保证外层副作用函数能够被收集到依赖集合中。类似于回溯算法的思想。

### 无限循环

比如自增 obj.a++会导致栈溢出无限循环
如果 trigger 触发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行

### 调度系统

可调度性是响应系统非常重要的特性。首先我们需要明确什么是可调度性。所谓可调度，指的是当 trigger 动作触发副作用函数重新执行时，有能力决定副作用函数执行的时机、次数以及方式。

于是在注册副作用函数的函数中加入调度器，用来控制副作用函数的执行时机、次数以及方式。

比如说我们可以把副作用函数放到宏任务队列中执行，达到调整优先级的效果；我们也可以通过任务队列来优化副作用函数的执行次数，比如说在一次事件循环中，如果同一个副作用函数被触发多次，我们只需要执行一次即可。

### 计算属性

计算属性是一个属性值，当其依赖的响应式数据发生变化时会进行重新计算
当依赖的数据发生变化，调度系统会把计算属性标记为脏，并在下次访问时重新计算
只有被访问的时候才会重新计算-惰性求值

### watch

watch是一个函数，当依赖的响应式数据发生变化时会执行watch函数

## 非原始值（对象）的响应式方案

proxy：代理一个对象的getter和setter，得到一个proxy实例
Reflect：在proxy使用this时，保证this指向proxy

## 原始值（非对象）的响应式方案

原始值的响应式方案：ref
通过语法糖get，set函数标记符，让函数作为属性被调用
