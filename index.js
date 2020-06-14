const fs = require('fs');
var yazl = require('yazl');


/* 
    先写一个简单的版本，后面在想异步优化
    入口应该是一个数组，用于将数组里面的内容全部弄到一个新的文件夹,这个文件夹是随机命名的
*/
class MultiZipPlugin{
    constructor(options){
        console.log(options);
        this.options = options;
    }

    // 递归加入文件夹
    addDirectory(zipFile, src){
        if (fs.lstatSync(this.buildPath + "/" + src).isDirectory()){
            zipFile.addEmptyDirectory(src);

            let files = fs.readdirSync(this.buildPath + "/" + src);
            for (let file in files){
                addDirectory(zipFile, src + "/" + file);
            }
        }else{
            zipFile.addFile(this.buildPath + "/" + src, src);
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
        compiler.hooks.afterEmit.tapAsync("MultiZipPlugin", (compilation, callback) => {
            console.log(this.options);
            
            debugger;
            this.buildPath = compilation.options.output.path;       // 打包的文件路径
            let zipFile = new yazl.ZipFile();
            
            for (let k in this.options){
                // 对每个配置去打包
                let option = this.options[k];
                let entrys = option.entrys;    // 要打包文件的数组
                let zipName = option.zipName;  // 最后输出的文件名
                let zipPath = option.zipPath;  // 打包文件输出的路径

                // 这里一点一点的把入口文件输出到目标文件夹里
                for (let i in entrys){
                    // 如果不存在则跳过
                    if (!fs.existsSync(this.buildPath + "/" + entrys[i])){
                        continue;
                    }

                    // 判断一下是文件还是文件夹
                    if (!fs.lstatSync(this.buildPath + "/" + entrys[i]).isDirectory()){
                        zipFile.addFile(this.buildPath + "/" + entrys[i], entrys[i]);
                        continue;
                    }

                    // 递归处理文件夹
                    let files = fs.readdirSync(this.buildPath + "/" + entrys[i]);
                    for (let j in files){
                        if (fs.lstatSync(this.buildPath + "/" + entrys[i] + "/" + files[j]).isDirectory()){
                            addDirectory(zipFile, entrys[i] + "/" + files[j]);
                        }else{
                            zipFile.addFile(this.buildPath + "/" + entrys[i] + "/" + files[j], entrys[i] + "/" + files[j]);
                        }
                    }
                }

                zipFile.outputStream.pipe(fs.createWriteStream(this.buildPath + "/" + zipName + ".zip")).on("close", function() {
                    console.log(zipName + " done");
                  });

                // 打一个包
                zipFile.end();
            }

            callback();
        })
    }
}


module.exports = MultiZipPlugin;