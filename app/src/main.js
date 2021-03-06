(function() {
	'use strict';

	var VERSION = 1.1;

	// initialize options
	var options = {};

	// language
	var translator = require('./custom_modules/translator');
	var lang = translator.getLanguage();

	// logger
	var logger = {
		v: function(str) {
			console.log(str);
		},
		i: function(str) {
			console.info('%c' + str, 'color: dodgerblue');
		},
		w: function(str) {
			console.warn('%c' + str, 'color: orange');
		},
		e: function(str) {
			console.error('%c' + str, 'color: red');
		}
	};
	require('./custom_modules/logger').set(logger);

	// server
	var server = require('./custom_modules/entry');
	server.open(logger);

	// router
	var router = require('./custom_modules/router').init(server);
	window.router = router;

	// flasher
	var flasher = require('./custom_modules/flasher');
	// ui & control
	$('.alertMsg .alertMsg1').text(translator.translate('If unexpected problem occurs while operating,'));
	$('.alertMsg .alertMsg2').text(translator.translate('contact the hardware company to resolve the problem.'));
	$('#errorAlert .comment').text(translator.translate('* Entry Labs is not responsible for the extension program and hardware products on this site.'));

	$('#reference .emailTitle').text(translator.translate('E-Mail : '));
	$('#reference .urlTitle').text(translator.translate('WebSite : '));

	$('#driver').text(translator.translate('Install Device Driver'));
	$('#firmware').text(translator.translate('Install Firmware'));
	$('#other-robot .text').text(translator.translate('Connect Other Hardware'));
	$('#entry .text').text(translator.translate('Show Entry Web Page'));

	var copyRecursiveSync = function(src, dest) {
		var exists = fs.existsSync(src);
		var stats = exists && fs.statSync(src);
		var isDirectory = exists && stats.isDirectory();
		if (exists && isDirectory) {
			if(!fs.existsSync(dest)) {
				fs.mkdirSync(dest);
			}
			fs.readdirSync(src).forEach(function(childItemName) {
				copyRecursiveSync(path.join(src, childItemName),
				            path.join(dest, childItemName));
			});
		} else {
			var data = fs.readFileSync(src);
			fs.writeFileSync(dest, data);
		}
	};

	var ui = {
		countRobot: 0,
		showRobotList: function() {
			router.close();
			router.stopScan();
			delete window.currentConfig;
			$('#title').text(translator.translate('Select hardware'));
			$('#hwList').show();
			$('#hwPanel').css('display', 'none');
			ui.showIeGuide();
			this.hideAlert();
		},
		showConnecting: function() {
			$('#title').text(translator.translate('hardware > connecting'));
			$('#hwList').hide();
			$('#hwPanel').css('display', 'flex');
			ui.hideIeGuide();
			this.showAlert(translator.translate('Connecting to hardware device.'));
		},
		showConnected: function() {
			$('#title').text(translator.translate('hardware > connected'));
			$('#hwList').hide();
			$('#hwPanel').css('display', 'flex');
			ui.hideIeGuide();
			this.showAlert(translator.translate('Connected to hardware device.'), 2000);
		},
		showDisconnected: function() {
			$('#title').text(translator.translate('hardware > disconnected'));
			$('#hwList').hide();
			$('#hwPanel').css('display', 'flex');
			ui.hideIeGuide();
			this.showAlert(translator.translate('Hardware device is disconnected. Please restart this program.'));
		},
		showAlert: function(message, duration) {
			$('#alert').text(message);

			$('#alert').css({
				height: '0px'
			});
			$('#alert').animate({
				height: '35px'
			});

			if (duration) {
				setTimeout(function(){
					$('#alert').animate({
						height: '0px'
					});
				}, duration);
			}
		},
		hideAlert: function(message) {
			$('#alert').animate({
				height: '0px'
			});
		},
		addRobot: function(config) {
			ui.showRobotList();
			var name;
			if(config.name) {
				name = config.name[lang] || config.name['en'];
			}

			$('#hwList').append(
					'<div class="hardwareType" id="' + config.id + '">' +
					'<img class="hwThumb" src="./modules/' + config.icon + '">' +
					'<h2 class="hwTitle">' + name + '</h2></div>');

			$('#' + config.id).click(function() {
				if(config.hardware.type === 'bluetooth') {
					is_select_port = true;
				}

				if(Array.isArray(selectedList)) {
					var newSelectList = selectedList.filter(function (item) {
						return item !== config.name.ko;
					});
					newSelectList.push(config.name.ko);
					localStorage.setItem('hardwareList', JSON.stringify(newSelectList));
					selectedList = newSelectList;
				} else {
					selectedList = [config.name.ko];
					localStorage.setItem('hardwareList', JSON.stringify(selectedList));
				}
				ui.hardware = config.id.substring(0, 4);
				ui.numLevel = 1;
				ui.showConnecting();
				router.startScan(config);
				window.currentConfig = config;

				var icon = './modules/' + config.icon;
				$('#selectedHWThumb').attr('src', icon);

				if(config.url) {
					$('#url').text(config.url);
					$('#urlArea').show();
					$('#url').unbind('click');
					$('#url').click(function() {
						shell.openItem(config.url);
					});
				} else {
					$('#urlArea').hide();
				}

				if(config.email) {
					$('#email').text(config.email);
					$('#emailArea').show();
					$('#email').unbind('click');
					$('#email').click(function() {
						clipboard.writeText(config.email);
						alert(translator.translate('Copied to clipboard'));
					});
				} else {
					$('#emailArea').hide();
				}

				$('#driver').hide();
				$('#firmware').hide();
				$('#extFirmware').hide();				
				$('#extFirmwarea').hide();	
				$('#firmware').on('click', function () {
					ui.flashFirmware(this.firmware, config);
				});
				$('#extFirmware').on('click', function () {
					ui.flashFirmware(this.firmware, config);
				});
				$('#extFirmwarea').on('click', function () {
					ui.flashFirmware(this.firmware, config);
				});
				
				if(config.driver) {
					var os = process.platform + '-' + (isOSWin64() ? 'x64' : process.arch);
					var driverPath = config.driver[os];
					if(driverPath) {
						$('#driver').show();
						$('#driver').unbind('click');
						$('#driver').click(function() {
							var driversPath;
							if(__dirname.indexOf('.asar') >= 0) {
								var sourcePath = path.join(__dirname, 'drivers');
								driversPath = path.join(__dirname, '..', 'drivers');
								if(!fs.existsSync(driversPath)) {
									copyRecursiveSync(sourcePath, driversPath);
								}
								driversPath = path.resolve(driversPath, driverPath)
							} else {
								driversPath = path.join(__dirname, 'drivers', driverPath);
							}

							shell.openItem(driversPath);
						});
					}
					if (config.firmware) {
						$('#firmware').show();
						if(typeof config.firmware === 'string') {
							$('#firmware').text(translator.translate('Install Firmware'));
							$('#firmware').prop('firmware', config.firmware);
						} else if(Array.isArray(config.firmware)) {
							var firmware = config.firmware[0];
							var extFirmware = config.firmware[1];
							var extFirmwarea = config.firmware[2];
							$('#extFirmware').show().text(translator.translate(extFirmware.translate));
							$('#extFirmware').prop('firmware', extFirmware.name);
							$('#extFirmwarea').show().text(translator.translate(extFirmwarea.translate));
							$('#extFirmwarea').prop('firmware', extFirmwarea.name);
							$('#firmware').text(translator.translate(firmware.translate));
							$('#firmware').prop('firmware', firmware.name);
						}

					}
				}
			});
		},
		flashFirmware: function(firmware, config) {
			$('#firmwareButtonSet').hide();
			try{
				if (!router.connector) {
					alert(translator.translate('Hardware Device Is Not Connected'));
					$('#firmwareButtonSet').show();
					return;
				}
				ui.showAlert(translator.translate("Firmware Uploading..."));
				var port = router.connector.sp.path;
				var baudRate = config.firmwareBaudRate;
				router.close();
	            setTimeout(function () {
	    			flasher.flash(
	    				firmware,
	    				port,
	    				baudRate
	    				,
	    				function(error, stdout, stderr) {
	    					$('#firmwareButtonSet').show();
	    					ui.showAlert(translator.translate("Firmware Uploaded!"));
	    					router.startScan(config);
	    				}
	    			);
	            }, 200);
			} catch(e) {
				$('#firmwareButtonSet').show();
			}
		},
		setState: function(state) {
			if(state == 'connected') {
				ui.showConnected();
			} else if(state == 'lost') {
				$('#message').text(translator.translate('Connecting...'));
			} else if(state == 'disconnected') {
				ui.showDisconnected();
			}
		},
		quit: function() {

		},
		showIeGuide: function() {
			$('#errorAlert').show();
		},
		hideIeGuide: function() {
			$('#errorAlert').hide();
		}
	};

	$('#back.navigate_button').click(function(e) {
		is_select_port = true;
		delete window.currentConfig.this_com_port;
		ui.showRobotList();
		router.close();
	});

	$('.chromeButton').click(function(e) {
		shell.openItem("https://www.google.com/chrome/browser/desktop/index.html");
	});


	function isOSWin64() {
  		return process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
	};

	// close
	window.onbeforeunload = function(e) {
		var isQuit = true;
		if(router.connector && router.connector.connected) {
			isQuit = confirm(translator.translate('Connection to the hardware will terminate once program is closed.'));
		}		

		if(isQuit) {
			router.close();
			server.close();
		} else {
			e.preventDefault();
			e.returnValue = false;
		}
	};

	$('#select_port').dblclick(function () {
		$('#btn_select_port').trigger('click');
	});

	$('#btn_select_port').click(function(e) {
		var com_port = $("#select_port").val();
		if(!com_port) {
			alert('연결할 COM PORT를 선택하세요.');
		} else {
			window.currentConfig.this_com_port = com_port[0];
			clear_select_port();
		}
	});

	$('#btn_select_port_cancel').click(function(e) {
		clear_select_port();
		clearTimeout(select_port_connection);
		ui.showRobotList();
	});

	function clear_select_port() {
		is_select_port = false;
		_cache_object = '';
		$('#select_port_box').css('display', 'none');
	}


	var _cache_object = '';
	var _com_port = '';
	var is_select_port = true;
	var select_port_connection;
	// state
	router.on('state', function(state, data) {
		if (state === "select_port") {
			router.close();
			var _temp = JSON.stringify(data);
			if(_temp !== _cache_object && is_select_port) {
				var port_html = '';
				data.forEach(function (port) {
					port_html += '<option>' + port.comName + '</option>';
				});				

				$('#select_port_box').css('display', 'flex');
				$('#select_port_box select').html(port_html);

				_cache_object = _temp;		
			}		
			if(is_select_port) {
				select_port_connection = setTimeout(function () {
					router.startScan(window.currentConfig);
				}, 1000);
			} else {
				is_select_port = true;
			}
			return;
		} else if (state === "flash") {
			console.log('flash');
            $('#firmware').trigger('click');
		} else if (state === "connect" && window.currentConfig.softwareReset) {
			var sp = router.connector.sp;
			sp.set({dtr: false}, function(){});
			setTimeout(function() {sp.set({dtr: true}, function(){})}, 1000);
			return;
		} else if ((state === "lost" || state === "disconnected") && window.currentConfig.reconnect) {
			router.close();
			ui.showConnecting();
			router.startScan(window.currentConfig);
			return;
		} else if (state === "lost" || state === "disconnected") {
			state = "disconnected";
			router.close();
		} else if(state === 'before_connect' && window.currentConfig.firmware) {
			ui.showAlert(translator.translate('Connecting to hardware device.') + ' 펌웨어를 선택해 주세요.');
		}
		ui.setState(state);
		server.setState(state);
	});

	//ipcEvent
	ipcRenderer.on('update-message', function (e, message) {

	});

	// configuration
	var fs = require('fs');
	var path = require('path');
	fs.readdir(path.join(__dirname, 'modules'), function(error, files) {
		if(error) {
			logger.e(error);
			return;
		}
		var hardwareList = [];
		files.filter(function(file) {
			return /(?:\.([^.]+))?$/.exec(file)[1] == 'json';
		}).forEach(function(file) {
			try {
				var config = fs.readFileSync(path.join(__dirname, 'modules', file));
				hardwareList.push(JSON.parse(config));
			} catch(e) {}
		});

		hardwareList.sort(function (left, right) {
			var lName = left.name.ko.trim();
			var rName = right.name.ko.trim();
			var lIndex = (Array.isArray(selectedList)) ? selectedList.indexOf(lName) : 0;
			var rIndex = (Array.isArray(selectedList)) ? selectedList.indexOf(rName) : 0;
			if(lIndex < rIndex) {
				return 1;
			} else if (lIndex > rIndex) {
				return -1;
			} else if(lName > rName) {
				return 1;
			} else if(lName < rName) {
				return -1;
			} else {
				return 0;
			}
		});

		hardwareList.forEach(function (config) {
			ui.addRobot(config);
		});
	});
}());
