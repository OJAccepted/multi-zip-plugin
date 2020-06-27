const fs = require('fs');
var yazl = require('yazl');


/* 
    先写一个简单的版本，后面在想异步优化
    入口应该是一个数组，用于将数组里面的内容全部弄到一个新的文件夹,这个文件夹是随机命名的
*/
class MultiZipPlugin {
    constructor(options) {
        console.log(options);
        this.options = options;
    }

    // 递归拷贝
    copy(src, dist) {
        if (fs.lstatSync(src).isDirectory()) {
            let files = fs.readdirSync(src);

            for (let file in files) {
                copy(file, dist + "/" + src);
            }
        } else {
            fs.writeFileSync(dist, fs.readFileSync(src));
        }
    }

    apply(compiler) {
        compiler.hooks.afterEmit.tapAsync("MultiZipPlugin", (compilation, callback) => {
            console.log(this.options);

            this.buildPath = compilation.options.output.path;       // 打包的文件路径
            
            let that = this;
            for (let k in this.options) {
                let zipFile = new yazl.ZipFile();
                let count = 0;

                function increaseCount(){
                    ++count;
                }

                function decreaseCount(){
                    --count;

                    if (count === 0) {
                        zipFile.outputStream.pipe(fs.createWriteStream(that.buildPath + "/" + zipName + ".zip")).on("close", function () {
                            console.log(zipName + " done");
                        });
        
                        // 打一个包
                        zipFile.end();
                    }
                }

                // 递归加入文件夹
                function addDirectory(src){
                    increaseCount()
                    fs.lstatSync(this.buildPath + "/" + src, (err, lstat) => {
                        decreaseCount();

                        if (lstat.isDirectory()) {
                            zipFile.addEmptyDirectory(src);
                            fs.readdir(that.buildPath + "/" + src, (err, files) => {
                                for (let file in files) {
                                    addDirectory(src + "/" + file);
                                }

                                decreaseCount();

                            })
                        } else {
                            zipFile.addFile(that.buildPath + "/" + src, src);
                        }
                    })
                }
                // 对每个配置去打包
                let option = this.options[k];
                let entrys = option.entrys;    // 要打包文件的数组
                let zipName = option.zipName;  // 最后输出的文件名

                // 这里一点一点的把入口文件输出到目标文件夹里
                let that = this;
                for (let i in entrys) {
                    increaseCount();
                    fs.exists(this.buildPath + "/" + entrys[i], (err, res) => {
                        if (res){
                            increaseCount();
                            fs.lstat(that.buildPath + "/" + entrys[i], (err, stat) => {
                                if (stat.isDirectory()){
                                    increaseCount();
                                    fs.readdir(that.buildPath + "/" + entrys[i], (err, files) => {
                                        for (let j in files){
                                            increaseCount();
                                            fs.lstat(that.build + "/" + entrys[i] + "/" + files[j], (err, stat) => {
                                                if (stat.isDirectory()){
                                                    addDirectory(entrys[i] + "/" + files[j]);
                                                }else{
                                                    zipFile.addFile(that.buildPath + "/" + entrys[i] + "/" + files[j], entrys[i] + "/" + files[j]);
                                                }
                                                decreaseCount();
                                            })
                                        }
                                        decreaseCount();
                                    })
                                }else{
                                    zipFile.addFile(that.buildPath + "/" + entrys[i], entrys[i]);
                                }

                                decreaseCount();
                            })
                        }
                        decreaseCount();
                    })

                }
            }

            callback();
        })
    }
}


module.exports = MultiZipPlugin;