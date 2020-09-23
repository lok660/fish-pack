#! /usr/bin/env node

const path = require('path')

const config = require(path.join(__dirname, '../webpack.config.js'))

// 找到项目目录下的 webpack.config.js 然后通过一个 compiler 解析它
const Complier = require('../lib/Compiler.js')
const complier = new Complier(config)

// 在 run 之前发布一个 entryOptions 的钩子
// complier.hooks.entryOptions.call()

// 调用 compiler 的 run 方法执行代码
complier.run()