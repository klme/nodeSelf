"use strict";
// アプリケーション作成用のモジュールを読み込み
const electron = require('electron');
const {app} = electron;
const {BrowserWindow} = electron;
const {ipcMain} = electron;
const noble = require('noble');
const serviceUUID ="18ee";
//const serviceUUID="713d0000503e4c75ba943148f18d941e"
//const serviceUUID ="723d0000503e4c75ba943148f18d941e";
let win;

function createWindow() {
  // メインウィンドウを作成します
  const Screen = electron.screen
  const size = Screen.getPrimaryDisplay().size
  win = new BrowserWindow({width: size.width, height:size.height,transparent:true,alwaysOnTop:true});
  //win.setIgnoreMouseEvents(true);
  // メインウィンドウに表示するURLを指定します
  win.loadURL(`file://${__dirname}/index.html`);
  // デベロッパーツールの起動
  win.webContents.openDevTools();
  // メインウィンドウが閉じられたときの処理
  win.on('closed', () => {
    win = null;
  });
}

//  初期化が完了した時の処理
app.on('ready', createWindow);

// 全てのウィンドウが閉じたらアプリケーションを終了します
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーションがアクティブになった時の処理(Macだと、Dockがクリックされた時）
app.on('activate', () => {
  // メインウィンドウが消えている場合は再度メインウィンドウを作成する
  if (win === null) {
    createWindow();
  }
});

// 非同期プロセス通信
ipcMain.on('asynchronous-message', function( event, args ){
   //マウスを無視する
   win.setIgnoreMouseEvents(true);
});

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
  	console.log('on -> stateChange: ' + state);
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('scanStart', function() {
    console.log('on -> scanStart');
});

noble.on('scanStop', function() {
    console.log('on -> scanStop');
});



noble.on('discover', function(peripheral) {
    console.log('on -> discover: ' + peripheral);
    // まずスキャンをとめる
    noble.stopScanning();
    // 接続時のイベント
    peripheral.on('connect', function() {
        console.log('on -> connect');
        this.discoverServices();
    });

    peripheral.on('disconnect', function() {
        console.log('on -> disconnect');
    });

    peripheral.on('servicesDiscover', function(services) {
        for(var i = 0; i < services.length; i++) {
          console.log(services[i]['uuid']);
            if(services[i]['uuid'] == serviceUUID){
                
                services[i].discoverCharacteristics();
                services[i].once('characteristicsDiscover', function(characteristics){
                  characteristics[0].notify(true, (error) => {
                      if (error) {
                          console.log('listen notif error', error)
                      } else {
                          console.log('listen notif')
                      }
                  });
                  console.time("loop time");
                  characteristics[0].on("data",function(data){
                    var datas = new Uint8Array(data);
                    var datas2 = new Array(6);
                    for(var co = 0;co<6;co++){
                       datas2[co] = datas[co];
                     }
                     console.log(datas2);
                     console.timeEnd("loop time");
                     console.time("loop time");
                     win.webContents.send('asynchronous-message', datas2);
                  });

                  /*setInterval(function(){
                    characteristics[0].read(function(error,data){
                      console.log(data);
                      var datas = new Uint8Array(data);
                      var datas2 = new Array(6);
                      for(var co = 0;co<6;co++){
                        datas2[co] = datas[co];
                      }
                      var Rdata = rawDataToAvDate(datas2);
                      console.log(cnt,datas2);
                      sheet.data[cnt] =  [cnt,Rdata[0]/4096, Rdata[1]/4096, Rdata[2]/4096];
                      win.webContents.send('asynchronous-message', datas2);

                      cnt++;
                      });
                    },200);*/
                    //console.log("on -> characteristics discover " + characteristics);
                });
            }
        }
    });
    peripheral.connect();
});


function rawDataToAvDate(array){
  var backArray = [];
  for(var j=0;j<array.length;j=j+2){
    if(array[j+1]<16){
      backArray[j/2] = array[j+1]*256+array[j];
    }else{
      backArray[j/2] = array[j+1]*256+array[j]-0xffff-1;
    }
  }
  return backArray;
}


