'use strict';


var is = require('oktopost-plankton').is;
var obj = require('oktopost-plankton').obj;
var func = require('oktopost-plankton').func;


function QueuedFunction(callback, options) {
	options = options || {};
	
	this.m_callback		= func.async(callback);
	this.m_min			= options.min || 1;
	this.m_max			= options.max || 1;
	this.m_postpone		= options.postpone || 0;
	this.m_isActive		= true;
	this.m_isRunning	= false;
	this.m_bulk			= false;
	this.m_queue		= [];
	
	if (this.m_max > 1 || is(options.bulk)) {
		this.m_bulk = true;
	}
	
	return this;
}


QueuedFunction.prototype._afterCallback = function _afterCallback() {
	this.m_isRunning = false;
	
	if (this.m_isActive) {
		this._execute();
	}
};

QueuedFunction.prototype._executeForSingleItem = function _executeForSingleItem() {
	var item = this.m_queue.splice(0, 1)[0];
	var self = this;
	
	this.m_callback.apply(null, item)
		.then(self._afterCallback.bind(self))
		.catch(function(error) {
			self._afterCallback();
			throw error;
		});
};

QueuedFunction.prototype._executeForBulk = function _execute() {
	var item = this.m_queue.splice(0, this.m_max);
	var self = this;
	
	this.m_callback.apply(null, item)
		.then(self._afterCallback.bind(self))
		.catch(function(error) {
			self._afterCallback();
			throw error;
		});
};

QueuedFunction.prototype._execute = function _execute() {
	if (this.m_isRunning || this.m_queue.length < this.m_min) {
		return;
	}
	
	this.m_isRunning = true;
	
	if (this.m_bulk) {
		this._executeForBulk();
	} else {
		this._executeForSingleItem();
	}
};

QueuedFunction.prototype._executeAsync = function _execute() {
	(func.postponed(this._execute.bind(this), this.m_postpone))();
};


QueuedFunction.prototype.start = function start() {
	this.m_isActive = true;
	this._executeAsync();
};

QueuedFunction.prototype.stop = function stop() {
	this.m_isActive = false;
};

QueuedFunction.prototype.runOnce = function runOnce() {
	this._executeAsync();
};

QueuedFunction.prototype.add = function add() {
	this.m_queue.push(obj.values(arguments));
	
	if (this.m_isActive) {
		this._executeAsync();
	}
};

QueuedFunction.prototype.clear = function clear() {
	this.m_queue = [];
};

QueuedFunction.prototype.abort = function abort() {
	this.stop();
	this.clear();
};

QueuedFunction.prototype.count = function count() {
	return this.m_queue.length;
};

QueuedFunction.prototype.isActive = function count() {
	return this.m_isActive;
};


QueuedFunction.create = function create(callback, options) {
	var q = new QueuedFunction(callback, options);
	
	return function() {
		QueuedFunction.prototype.add.call(q, arguments)
	};
};


module.exports = QueuedFunction;