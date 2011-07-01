/*globals global*/
var sys = require('sys');
global.sc_require = function(){};

require('./ThothSC/core');
require('./ThothSC/core_tools');
require('./ThothSC/store_tools');
require('./ThothSC/lib/model_cache');
require('./ThothSC/lib/model_graph');
require('./ThothSC/lib/request_cache');
require('./ThothSC/lib/user_data');
require('./ThothSC/lib/rpc');
require('./ThothSC/lib/crypto/basic_crypto');
require('./ThothSC/lib/crypto/md5');
require('./ThothSC/lib/crypto/ripemd160');
require('./ThothSC/lib/crypto/sha1');
require('./ThothSC/lib/crypto/sha256');
require('./ThothSC/lib/crypto/sha512');
require('./ThothSC/data_sources/data_source');
require('./ThothSC/lib/base_client');
require('./ThothSC/lib/fake_client');
require('./ThothSC/lib/websocket_client');
require('./ThothSC/lib/xhrpolling_client');

