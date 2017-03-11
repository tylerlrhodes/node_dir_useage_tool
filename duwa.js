

var fs = require('fs');
var Promise = require('bluebird');
var buckets = require('buckets-js');

var diruse = function() {

    this.count = 0;

    this.bst = new buckets.BSTree(function(a, b) {
        // intentionally reversed this compare function, so tree will return largest first for inorderTraversal
        if (a.size_ > b.size_) {
            return -1;
        } else if (a.size_ < b.size_) {
            return 1;
        } else {
            return a.path_.localeCompare(b.path_);
        }
    });

    this.calcDirUse = function (path, callback) {
        //console.log(path);
        var total_size = 0,
            size = 0;
        var p1 = new Promise(
            function(resolve, reject) {
                fs.readdir(path, function (err, files) {
                    if (err && err.errno !== -4048 && err.errno !== -4082 && err.errno !== -4058) {
                        reject(err);
                    } else {
                        resolve(files);
                    }
                });
            }
        ).then(
            function(files) {  
                if (!files) files = [];
                //console.log("in then");             
                function doStatAsync(file) {
                    return new Promise(
                        function(resolve, reject) {
                            fs.lstat(path + '\\' + file, (err, stats) => {
                                if (err && err.errno !== -4048 && err.errno !== -4082 && err.errno !== -4058) {
                                    reject(err);
                                } else {
                                    var arg = {
                                        path_ : path + file,
                                        stats_ : stats
                                    }
                                    resolve (arg);
                                }
                            });
                        }
                    )
                }
                let actions = files.map(doStatAsync);
                let results = Promise.all(actions);

                return results.then( 
                    function (arg) {
                        let len = arg.length,
                            i;
                        function doPopTreeAsync(path) {                  
                            return new Promise(
                                function(resolve, reject) {
                                    this.calcDirUse(path, function callback(size) {
                                        resolve(size);
                                    });
                                }
                            );
                        }  
                        let p = [];
                        for (i = 0; i < len; i++) {
                            if (arg[i].stats_ && arg[i].stats_.isDirectory()) {    
                                p.push(arg[i].path_ + "\\");                  
                            }
                            if (arg[i].stats_ && arg[i].stats_.isFile()) {
                                size += arg[i].stats_.size;
                            }
                        }

                        let actions = p.map(doPopTreeAsync),
                            results = Promise.all(actions);

                        return results.then(
                            function(arg) {
                                let len = arg.length,
                                    i,
                                    total_size = size;
                                for ( i = 0; i < len; i++ ) {
                                    total_size += arg[i];
                                }
                                bst.add({ path_ : path, size_ : size});
                                count++;
                                if (count % 1000 === 0) process.stdout.write(".");
                                callback(total_size);
                            }
                        ).catch (
                            function(err) {
                                console.log(err);
                            }
                        );
                    }

                ).catch (
                    function (err) {
                        console.log(err);
                    }
                );
            }
        ).catch(
            function(err) {
                console.log(err);
            }
        );

        return p1;
    }

    return this;

} ();

process.stdout.write("beginning analysis...");

var el = { path_ : "C:\\", size_ : 0, total_size_ : 0 };

var start = new Date(),
    end;

diruse.calcDirUse( el.path_ , (size) => {
    console.log(size);
}).then(
    function (arg) {
        end = new Date();
        console.log(bst.size());
        var i = 0;
        diruse.bst.forEach((obj) => {
            console.log(obj);
            ++i;
            if (i > 50) return false;
        });
        
        console.log(bst.toArray().slice(0,50).map((a) => { return a.size_; }).reduce((a, b) => { 
            return a + b;  
        }).toLocaleString());

        console.log((end - start) / 1000);
    }
);








