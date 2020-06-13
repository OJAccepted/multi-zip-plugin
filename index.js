const fs = require('fs');
const path = require('path');
var yazl = require('yazl');

const stringRandom = require('string-random');

/* 
    先写一个简单的版本，后面在想异步优化
    入口应该是一个数组，用于将数组里面的内容全部弄到一个新的文件夹,这个文件夹是随机命名的
*/
class MultiZipPlugin{
    constructor(options){
        this.options = options;
    }

    // 递归加入文件夹
    addDirectory(zipfile, src){
        if (fs.lstatSync(this.buildPath + src).isDirectory()){
            zipfile.addEmptyDirectory(src);

            let files = fs.readdirSync(this.buildPath + src);
            for (let file in files){
                addDirectory(zipfile, this.buildPath + src + file);
            }
        }else{
            zipfile.addFile(this.buildPath + src + file, this.buildPath + src + file);
        }
    }

    // 递归拷贝
    copy(src, dist){
        if (fs.lstatSync(src).isDirectory()){
            let files = fs.readdirSync(src);

            for (let file in files){
                copy(file, dist + "/" + src);
            }
        }else{
            fs.writeFileSync(dist, fs.readFileSync(src));
        }
    }

    apply(compiler){
        compiler.hooks.emit.tapAsync("MultiZipPlugin", (compilation, callback) => {
            debugger;
            this.buildPath = compilation.options.output.path;       // 打包的文件路径
            let zipFile = new yazl.ZipFile();
            
            for (let option in this.options){
                // 对每个配置去打包
                let entrys = option.entrys;    // 要打包文件的数组
                let zipName = option.zipName;  // 最后输出的文件名
                let zipPath = option.zipPath;  // 打包文件输出的路径

                let dirName = stringRandom(16)
                fs.mkdirSync(zipPath, dirName);

                // 这里一点一点的把入口文件输出到目标文件夹里
                for (let entry in entrys){
                    let files = fs.readdirSync(entry);
                    for (let file in files){
                        if (fs.lstatSync(file).isDirectory()){
                        }else{
                            zipfile.addFile(file, file);
                        }
                    }
                }

                zipfile.outputStream.pipe(fs.createWriteStream(zipName + ".zip")).on("close", function() {
                    console.log(zipName + " done");
                  });

                // 打一个包
                zipfile.end();
            }

            callback();
        })
    }
}


module.exports = MultiZipPlugin;