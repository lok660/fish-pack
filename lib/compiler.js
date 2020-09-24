const path = require('path')
const fs = require('fs')
// babylon 主要将源码转成 AST
const babylon = require('babylon')
// 用来遍历以及更新 AST node
const traverse = require('@babel/traverse').default // es6 模块
// 类似 lodash 的一个用于处理 AST node 的工具库
const t = require('@babel/types')
// 将 AST node 转换成 code
const generator = require('@babel/generator').default // es6 模块
const ejs = require('ejs')
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants')


class Complier {
  constructor(config) {
    //  需要保存的入口文件的路径,如./src/index.js
    this.entryId
    //  需要保存的所有模块的依赖
    this.modules = {}
    this.assert = {}  //  输出的资源文件
    this.config = config
    this.entry = config.entry   //  入口路径
    this.root = process.cwd()   //  项目工作的全局路径
  }
  run () {
    this.bindModule(path.resolve(this.root, this.entry), true)
    console.log('run()', this.modules, this.entryId)
    this.emitFile()
  }
  //  创建模块间的依赖关系
  bindModule (modulePath, isEntry) {
    //  拿到路径对应的内容
    const moduleSource = this.getModuleSource(modulePath)
    //  模块id
    const moduleName = './' + path.relative(this.root, modulePath)
    isEntry && (this.entryId = moduleName)
    //  将模块的源码进行改造,并且返回一个依赖的列表
    //  主要是将require编程 __webpack_require__
    //  然后将 require('./a.js') 变成 __webpack_require__('src/a.js')
    const { newModuleSource, dependencies } = this.parse(moduleSource, path.dirname(moduleName))

    //  把相对路径和模块中的内容对应起来
    this.modules[moduleName] = newModuleSource

    //  模块里面还有依赖的就要递归建立依赖关系
    dependencies.forEach(dp => {
      this.bindModule(path.join(this.root, dp), false)
    })
    console.log('code : ', newModuleSource)
    console.log('denp : ', dependencies)
    console.log('---------------------------')
  }

  //  发射一个打包后的文件
  emitFile () {
    //  输出文件路径
    const { filename } = this.config.output
    const { entryId, modules } = this
    const outputFilePath = path.join(this.config.output.path, filename)
    const template = this.getModuleSource(path.join(__dirname, '../template/main.ejs'))
    const outputFileCode = ejs.render(template, { entryId, modules })

    //  保存输出文件路径
    this.assert[outputFilePath] = outputFileCode

    //  写入对应路径
    fs.writeFileSync(outputFilePath, this.assert[outputFilePath])
  }

  //  拿到模块内容
  getModuleSource (modulePath) {


    //  拿到模块内容
    let content = fs.readFileSync(modulePath, 'utf-8')

    //  拿到配置的loader
    const { rules } = this.config.module

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]

      const { test, use } = rule
      //  处理对应 test 下的use
      let len = use.length - 1

      //  先匹配 test 正则
      if (test.test(modulePath)) {
        //  匹配对了就处理loader,这个是倒着处理的
        function normalLoader () {
          //  获取对应的loader
          const loader = require(use[len--])
          //  转换代码
          content = loader(content)
          console.log(content)
          console.log('-----------------------')
          //  loader没调用完之前就继续递归调用 loader来解析代码
          len >= 0 && normalLoader()
        }
        normalLoader()
      }
    }

    return content
  }

  //  解析模块源码
  parse (moduleSource, parentPath) {
    // console.log(moduleSource, parentPath)
    //  将源码转换成AST
    let ast = babylon.parse(moduleSource)

    //  遍历以修改 AST node
    const dependencies = []

    traverse(ast, {
      CallExpression (p) { // 调用表达式
        const { node } = p
        let { name } = node.callee
        // 修改调用名，即将 require -> __webpack_require__
        if (name === 'require') {
          node.callee.name = '__webpack_require__'
          // 修改模块名，将其变成 ./src/a.js
          let moduleName = node.arguments[0].value
          // 自动添加后缀名
          moduleName += path.extname(moduleName) ? '' : '.js'
          // 添加父级路径
          moduleName = './' + path.join(parentPath, moduleName)
          // 添加进依赖列表
          dependencies.push(moduleName)
          // 构建 Literal 对象
          node.arguments = [t.stringLiteral(moduleName)]
        }
      }
    })
    //  将 AST转换成源码
    const newModuleSource = generator(ast).code
    return { newModuleSource, dependencies }
  }
}

module.exports = Complier