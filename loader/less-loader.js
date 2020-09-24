const less = require('less')

function loader (source) {
  let css = ''
  less.render(source, (err, c) => {
    //  将source转换c.css
    css = c.css
  })
  //  将css code中的 \n 字符串转换成 \\n,不然浏览器会报错
  css = css.replace(/\n/g, '\\n')
  return css
}


module.exports = loader