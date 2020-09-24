//  创建一个style标签,将转换的源码插入到页面的head部分
function loader (source) {
  //  style.innerHTML = ${JSON.stringify(source)} 将css源码转成一行
  let style = `
    let style = document.createElement('style')
    style.innerHTML = ${JSON.stringify(source)}
    document.head.appendChild(style)
  `

  return style
}

module.exports = loader