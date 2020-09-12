#! /usr/bin/env node

const { program } = require('commander');
const path = require('path')
const { version } = require('../package.json')

const commandMap = {
  create: {
    alias: 'c',
    description: 'This is a create a my-cli',
    example: 'my-cli create <app-name>'
  },
  add: {
    alias: 'a',
    description: 'This is a add a my-cli',
    example: 'my-cli add <plugin-name>'
  },
  '*': {
    alias: '',
    description: '',
    example: ''
  }
}

Reflect.ownKeys(commandMap).forEach(key => {
  const value = commandMap[key]
  program
    .command(key)
    .alias(value.alias)
    .description(value.description)
    .action(() => {
      if(key === '*') {
        console.log('指令不存在');
      }
      const argv = process.argv.splice(3)
      require(path.resolve(__dirname, key))(...argv)
    })
})

program.on('--help', () => {
  console.log('Example: ');
  Reflect.ownKeys(commandMap).forEach(key => {
    const value = commandMap[key]
    console.log(`  ${value.example}`);
  })
})

program.version(version).parse(process.argv)