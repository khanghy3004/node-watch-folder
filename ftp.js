const path = require('path');
const fs = require('fs');
const Client = require('ftp');

const config = require("./config");

// config.writeData('localDir', 'my-folder');
// config.writeData('remoteDir', '/');
// config.writeData('host', '79.124.7.251');
// config.writeData('user', 'hy');
// config.writeData('password', '3004');

const localDir = config.readData('localDir');
const remoteDir = config.readData('remoteDir');
const host = config.readData('host');
const user = config.readData('user');
const password = config.readData('password');

let taskCount = "";

// Tạo một FTP client
exports.client = async function () {
    const ftpConfig = {
        host: host,
        user: user,
        password: password
    };
    const ftpClientSuper = new Client();
    ftpClientSuper.connect(ftpConfig);
    return ftpClientSuper;
}

// Hàm đồng bộ hóa các tệp tin từ máy chủ từ xa
exports.syncRemoteFiles = async function (client, mainWindow) {
    try {
        mainWindow.webContents.send('restartTable');

        client.list(async function (err, list) {
            if (err) throw err;
            for (const remoteFile of list) {
                if (remoteFile.type === '-') {
                    mainWindow.webContents.send('file-remote', remoteFile.name, remoteFile.size, remoteFile.date);

                    const localFilePath = path.join(localDir, remoteFile.name);
                    const remoteFilePath = path.join(remoteDir, remoteFile.name);

                    // Nếu tệp tin chưa tồn tại cục bộ hoặc có sự khác biệt giữa tệp tin cục bộ và tệp tin từ xa thì tải xuống tệp tin từ xa
                    if (!fs.existsSync(localFilePath) || (remoteFile.size !== fs.statSync(localFilePath).size)) {
                        console.log(`Downloading file ${remoteFilePath}...`);
                        client.get(remoteFilePath, function (err, stream) {
                            if (err) throw err;
                            stream.pipe(fs.createWriteStream(localFilePath));
                            console.log(`Download done ${remoteFilePath}`);
                        });
                    }
                }
            }
        });
    }
    catch (err) {
        console.log(err);
    }
    // finally {
    //     client.close();
    // }
}

// Hàm đồng bộ hóa tệp tin lên máy chủ từ xa
exports.syncLocalFiles = async function (client, localFilePath, type) {
    try {
        const remoteFilePath = remoteDir + localFilePath.replace(localDir, '').replace(/\\/g, '/');
        if (type === "change" && checkDiffFile(client, localFilePath) == false) {
            console.log(`Uploading file ${localFilePath} to ${remoteFilePath}...`);
            client.put(localFilePath, remoteFilePath, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`Uploaded ${filePath}`);
                }
            });
        } else if (type === "unlink" && checkDiffFile(client, localFilePath) == true) {
            console.log(`Delete file ${remoteFilePath}...`);
            client.delete(remoteFilePath, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`File ${remoteFilePath} deleted`);
                }
            });
            console.log(`File ${remoteFilePath} deleted`);
        }
    }
    catch (err) {
        console.error(`FTP client error: ${err}`);
    }
    // finally {
    //     client.close();
    // }
}

async function checkDiffFile(client, localFilePath) {
    const remoteFilePath = remoteDir + localFilePath.replace(localDir, '').replace(/\\/g, '/');
    // Get the local file stats
    const localStats = fs.statSync(localFilePath);
    // Get the remote file stats
    client.size(remoteFilePath, (err, remoteSize) => {
        if (err) {
            console.error(err);
        } else {
            client.lastMod(remoteFilePath, (err, remoteTime) => {
                if (err) {
                    console.error(err);
                } else {
                    // Compare the size and modification time
                    if (localStats.size === remoteSize && localStats.mtime.getTime() === remoteTime.getTime()) {
                        return true;
                    } else {
                        return false;
                    }
                }
            });
        }
    });
    return true;
}