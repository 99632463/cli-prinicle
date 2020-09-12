const axios = require('axios')
const ora = require('ora');
const inquirer = require('inquirer');
const path = require('path')
var shell = require('shelljs');
const chalk = require('chalk')
const Metalsmith = require('metalsmith')
let download = require('download-git-repo')
let { render } = require('consolidate').ejs;
let ncp = require('ncp').ncp;
const { promisify } = require('util')

download = promisify(download)
ncp = promisify(ncp)
exec = promisify(shell.exec)
render = promisify(render)

const getTemplateNames = async () => {
    const { data } = await axios.get('https://api.github.com/orgs/kai-wang-com/repos')
    return data
}
const getTemplateTags = async projectName => {
  const {data} = await axios.get(`https://api.github.com/repos/kai-wang-com/${projectName}/tags`)
  return data
}
const getDownloadDirPath = () => {
  const platform = process.platform === 'win32' ? 'USERPROFILE' : 'HOME'
  const downloadDirPath = process.env[platform] + '\\.kai-template'
  return downloadDirPath
}
const downloadTemplate = async (templateName, templateTag) => {
  let url = `kai-wang-com/${templateName}`
  if(templateTag){
    url += `#${templateTag}`
  }

  let descPath = getDownloadDirPath() + `\\${templateName}`
  await download(url, descPath);

  return descPath
}
const installDependencies = async projectName => {
  shell.cd(projectName);
  exec('npm install')
}

const waitLoading = (message, fn) => async (...argv) => {
  const spinner = ora(message)
  spinner.start()
  const data = fn && await fn(...argv)
  spinner.succeed(`${message} succeedfully`)
  return data
}

module.exports = async projectName => {
  // update-notifier boxen  这两个库用来做更新版本提示

  // const data = await waitLoading('downning template name', getTemplateNames)()
  // const templateNames = data.map(item => item.name)
   
  // const { currentTemplateName } = await inquirer.prompt({
  //   type: 'list',
  //   name: 'currentTemplateName',
  //   choices: templateNames,
  //   message: '请选择要使用哪个模版创建一个项目'
  // })

  // const data2 = await waitLoading('downning template tag', getTemplateTags)('kai-simple-template')
  // const templateTags = data2.map(item => item.name)
  
  // const { currentTemplateTag } = await inquirer.prompt({
  //   type: 'list',
  //   name: 'currentTemplateTag',
  //   choices: templateTags,
  //   message: '请选择要使用哪个版本来创建项目'
  // })

  // 下载模版
  const downloadPath = await waitLoading('downning template', downloadTemplate)('kai-template') 

  // 拷贝模版
  // await waitLoading('copying template', ncp)(downloadPath, path.resolve(projectName)) 

  // 编译模版
  Metalsmith(__dirname)
  .source(downloadPath)
  .destination(path.resolve(projectName))
  .use(async (files, metal, callback) => {
    // 让用户填写配置信息
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'project-name ?'
      },
      {
        type: 'input',
        name: 'version',
        message: 'project-version ?'
      },
      {
        type: 'input',
        name: 'author',
        message: 'project-author ?'
      },
      {
        type: 'input',
        name: 'description',
        message: 'project-description ?'
      }
    ])
    let meta = metal.metadata()
    Object.assign(meta, result)
    callback()
  })
  .use((files, metal, callback) => {
    // 根据用户填写的配置信息来编译模版

    let result = metal.metadata()
    Reflect.ownKeys(files).forEach(async (filePath) => {
      if(filePath.includes('.js') || filePath.includes('.json')){
        const fileContent = files[filePath].contents.toString()
        if (fileContent.includes('<%')) {
          const resultContent = await render(fileContent, result)
          files[filePath].contents = Buffer.from(resultContent)
        }
      }
    })
    callback()

    // 自动安装依赖
    // await waitLoading('installing dependencies', installDependencies)(projectName) 

    // 显示创建成功之后的提示信息
    console.log(chalk.green('Successfully created project ') + chalk.red(`${projectName}.`));
    console.log(chalk.green('Get started with the following commands:'));
    console.log(chalk.magenta(`$ cd ${projectName}`));
    console.log(chalk.magenta(`$ npm install`));
    console.log(chalk.magenta(`$ npm run serve`));
  })
  .build(function(err) {
    if (err) throw err;
  });
}