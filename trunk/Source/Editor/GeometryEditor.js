function GeometryEditor() {
    this.svgElement = null;
    this.canvas = null;
}

GeometryEditor.configDoc = Dom.loadSystemXml("GeometryEditor.config.xml");

GeometryEditor.prototype.install = function (canvas) {
    this.canvas = canvas;
    this.canvas.onScreenEditors.push(this);
    this.svgElement = canvas.ownerDocument.importNode(Dom.getSingle("/p:Config/svg:g", GeometryEditor.configDoc), true);
    
    this.shapeWidth = document.getElementById("shapeWidth");
    this.shapeHeight = document.getElementById("shapeHeight");
    this.shapeX = document.getElementById("shapeX");
    this.shapeY = document.getElementById("shapeY"); 
    this.shapeA = document.getElementById("shapeAngle");
    
    
    this.svgElement.style.visibility = "hidden";
    canvas.installControlSVGElement(this.svgElement);
    
    this.anchorContainer = Dom.getSingle("./svg:g[@p:name='Anchors']", this.svgElement);
    this.borderRect = Dom.getSingle("./svg:rect[@p:name='Bound']", this.svgElement);
    
    //this.debugText = Dom.getSingle("./svg:text[@p:name='debug']", this.svgElement).firstChild;
    
    this.anchor0 = Dom.getSingle(".//svg:rect[@p:name='TopLeft']", this.svgElement);
    this.anchor1 = Dom.getSingle(".//svg:rect[@p:name='Top']", this.svgElement);
    this.anchor2 = Dom.getSingle(".//svg:rect[@p:name='TopRight']", this.svgElement);
    this.anchor3 = Dom.getSingle(".//svg:rect[@p:name='Right']", this.svgElement);
    this.anchor4 = Dom.getSingle(".//svg:rect[@p:name='BottomRight']", this.svgElement);
    this.anchor5 = Dom.getSingle(".//svg:rect[@p:name='Bottom']", this.svgElement);
    this.anchor6 = Dom.getSingle(".//svg:rect[@p:name='BottomLeft']", this.svgElement);
    this.anchor7 = Dom.getSingle(".//svg:rect[@p:name='Left']", this.svgElement);
    
    this.anchors = [this.anchor0, this.anchor1, this.anchor2, this.anchor3,
                        this.anchor4, this.anchor5, this.anchor6, this.anchor7];
    
    //mark them as anchor for ease of DOM lookup later. this is to boost up scaling performance
    for (i in this.anchors) {
        this.anchors[i]._editor = this;
        this.anchors[i]._isAnchor = true;
    }
    
    //dx, dy, dw, dh factors
    this.anchor0._matrix = {dx: 1,  dy: 1,  dw: -1, dh: -1};
    this.anchor1._matrix = {dx: 0,  dy: 1,  dw: 0,  dh: -1};
    this.anchor2._matrix = {dx: 0,  dy: 1,  dw: 1,  dh: -1};
    this.anchor3._matrix = {dx: 0,  dy: 0,  dw: 1,  dh: 0};
    this.anchor4._matrix = {dx: 0,  dy: 0,  dw: 1,  dh: 1};
    this.anchor5._matrix = {dx: 0,  dy: 0,  dw: 0, dh: 1};
    this.anchor6._matrix = {dx: 1,  dy: 0,  dw: -1, dh: 1};
    this.anchor7._matrix = {dx: 1,  dy: 0,  dw: -1, dh: 0};
    
    //register event
    var thiz = this;
    
    //registering event on the outmost item to have better UI interation
    var outmostItem = this.svgElement.ownerDocument.documentElement;
    outmostItem.addEventListener("mousedown", function (ev) {
        if (thiz.passivated) {
            outmostItem.removeEventListener("mousedown", arguments.callee, false);
            return;
        }
        thiz.handleMouseDown(ev);
    }, false);
    outmostItem.addEventListener("mouseup", function (ev) {
        if (thiz.passivated) {
            outmostItem.removeEventListener("mouseup", arguments.callee, false);
            return;
        }
        thiz.handleMouseUp(ev);
    }, false);
    outmostItem.addEventListener("mousemove", function (ev) {
        if (thiz.passivated) {
            outmostItem.removeEventListener("mousemove", arguments.callee, false);
            return;
        }
        thiz.handleMouseMove(ev);
    }, false);
    thiz.shapeWidth.addEventListener("change", function(event) {
        if (thiz.passivated) {
            thiz.shapeWidth.removeEventListener("change", arguments.callee, false);
            return;
        }
        thiz.applyGeo('w');
    }, false);
    thiz.shapeHeight.addEventListener("change", function(event) {
        if (thiz.passivated) {
            thiz.shapeHeight.removeEventListener("change", arguments.callee, false);
            return;
        }
        thiz.applyGeo('h');
    }, false);
    thiz.shapeX.addEventListener("change", function(event) {
        if (thiz.passivated) {
            thiz.shapeX.removeEventListener("change", arguments.callee, false);
            return;
        }
        thiz.applyGeo('x');
    }, false);
    thiz.shapeY.addEventListener("change", function(event) {
        if (thiz.passivated) {
            thiz.shapeY.removeEventListener("change", arguments.callee, false);
            return;
        }
        thiz.applyGeo('y');
    }, false);
    thiz.shapeA.addEventListener("change", function(event) {
        if (thiz.passivated) {
            thiz.shapeA.removeEventListener("change", arguments.callee, false);
            return;
        }
        thiz.applyGeo('a');
    }, false);
    
};
GeometryEditor.prototype.attach = function (targetObject) {
    if (targetObject.constructor == TargetSet) {
        this.dettach();
        return;
    }
    this.setTool("scale");
    this.targetObject = targetObject;
    
    var locking = this.getLockingPolicy();
    //enabled geometry toolbar
    this.shapeX.disabled=false;
    this.shapeY.disabled=false;
    this.shapeA.disabled = true //!locking.lockRatio ?false:true;
    this.shapeWidth.disabled  = !locking.width ?false:true;
    this.shapeHeight.disabled = !locking.height ?false:true;;
    
    var geo = this.canvas.getZoomedGeo(targetObject);
    this.setEditorGeometry(geo);
    
    this.svgElement.style.visibility = "visible";
    
    if (this.targetObject.getProperty("box")) {
        this.svgElement.removeAttributeNS(PencilNamespaces.p, "nobox");
    } else {
        this.svgElement.setAttributeNS(PencilNamespaces.p, "p:nobox", true);
        this.shapeWidth.disabled  = true;
        this.shapeHeight.disabled = true;
    }
};

GeometryEditor.prototype.dettach = function () {
    this.targetObject = null;
    this.svgElement.style.visibility = "hidden";
    //disabled geometry toolbar
    this.shapeX.disabled=true;
    this.shapeY.disabled=true;
    //this.shapeA.disabled=true;
    this.shapeWidth.disabled=true;
    this.shapeHeight.disabled=true;
    
};
GeometryEditor.prototype.invalidate = function () {
    if (!this.targetObject) return;
    var geo = this.canvas.getZoomedGeo(this.targetObject);
    this.setEditorGeometry(geo);
};

GeometryEditor.prototype.setEditorGeometry = function (geo) {
    this.shapeX.value=geo.ctm.e / this.canvas.zoom
    this.shapeY.value=geo.ctm.f / this.canvas.zoom
    this.shapeWidth.value=geo.dim.w / this.canvas.zoom
    this.shapeHeight.value=geo.dim.h / this.canvas.zoom
    this.shapeA.value = Svg.getAngle(geo.ctm.a,geo.ctm.b);
    //transformation
    Svg.ensureCTM(this.svgElement, geo.ctm);

    //dimension
    Svg.setWidth(this.borderRect, geo.dim.w);
    Svg.setHeight(this.borderRect, geo.dim.h);
    
    if (geo.loc) {
        Svg.setX(this.borderRect, geo.loc.x);
        Svg.setY(this.borderRect, geo.loc.y);
        
        this.anchorContainer.setAttribute("transform", "translate(" + [geo.loc.x, geo.loc.y] + ")");
    } else {
        Svg.setX(this.borderRect, 0);
        Svg.setY(this.borderRect, 0);
        this.anchorContainer.removeAttribute("transform");
    }
    
    
    //repositioning anchors
    var hx = Math.round((geo.dim.w - this.anchor1.width.baseVal.value + 1) / 2); // half of x
    var fx = geo.dim.w - this.anchor2.width.baseVal.value + 1;
    var hy = Math.round((geo.dim.h - this.anchor3.height.baseVal.value + 1) / 2);
    var fy = geo.dim.h - this.anchor4.height.baseVal.value + 1;
    
    Svg.setX(this.anchor1, hx);
    Svg.setX(this.anchor2, fx);

    Svg.setX(this.anchor3, fx);
    Svg.setY(this.anchor3, hy);

    Svg.setX(this.anchor4, fx);
    Svg.setY(this.anchor4, fy);

    Svg.setX(this.anchor5, hx);
    Svg.setY(this.anchor5, fy);

    Svg.setY(this.anchor6, fy);

    Svg.setY(this.anchor7, hy);
    
    this.geo = geo;
};
GeometryEditor.prototype.setBound = function (bound) {
    throw "@method: GeometryEditor.prototype.setBound is now depricated, using setEditorGeometry instead.";

    this.svgElement.setAttribute("transform", "translate(" + bound.x + "," + bound.y + ")");
    
    Svg.setWidth(this.borderRect, bound.w);
    Svg.setHeight(this.borderRect, bound.h);
    
    //repositioning anchors
    var hx = Math.round((bound.w - this.anchor1.width.baseVal.value + 1) / 2); // half of x
    var fx = bound.w - this.anchor2.width.baseVal.value + 1;
    var hy = Math.round((bound.h - this.anchor3.height.baseVal.value + 1) / 2);
    var fy = bound.h - this.anchor4.height.baseVal.value + 1;
    
    Svg.setX(this.anchor1, hx);
    Svg.setX(this.anchor2, fx);

    Svg.setX(this.anchor3, fx);
    Svg.setY(this.anchor3, hy);

    Svg.setX(this.anchor4, fx);
    Svg.setY(this.anchor4, fy);

    Svg.setX(this.anchor5, hx);
    Svg.setY(this.anchor5, fy);

    Svg.setY(this.anchor6, fy);

    Svg.setY(this.anchor7, hy);
    
    this.bound = bound;    
}
GeometryEditor.prototype.findAnchor = function (element) {
    var thiz = this;
    var anchor = Dom.findUpward(element, function (node) {
        return node._isAnchor && (node._editor == thiz);
    });
    
    return anchor;
};
GeometryEditor.prototype.handleMouseDown = function (event) {
    this.currentAnchor = this.findAnchor(event.originalTarget);
    this.oX = event.clientX;
    this.oY = event.clientY;
    
    this.oGeo = this.geo;
    
    //calculating sizing constraints
    if (!this.geo) return;
    
    this._e = this.geo.ctm.e;
    this._f = this.geo.ctm.f;
    this._w = this.geo.dim.w;
    this._h = this.geo.dim.h;
    
    var minDim = this.getMinDimension();
    var grid = this.getZoomedGridSize();
    
    var maxX1 = this._e + this._w - minDim.w * this.canvas.zoom;
    this._maxX1 = maxX1 - (maxX1 % grid.x);
    
    var minX2 = this._e + minDim.w * this.canvas.zoom;
    var r = minX2 % grid.x;
    this._minX2 = r == 0 ? minX2 : (minX2 + grid.x - r);
    
    var maxY1 = this._f + this._h - minDim.h * this.canvas.zoom;
    this._maxY1 = maxY1 - (maxY1 % grid.y);
    
    var minY2 = this._f + minDim.h * this.canvas.zoom;
    var r = minY2 % grid.y;
    this._minY2 = r == 0 ? minY2 : (minY2 + grid.y - r);
    
};

GeometryEditor.prototype.handleMouseUp = function (event) {
    try {
        if (this.currentAnchor) {
            this.canvas.setZoomedGeo(this.targetObject, this.geo);
            this.canvas.invalidateEditors(this);
        }
    } finally {
        this.currentAnchor = null;
    }
};
GeometryEditor.prototype.applyGeo = function (type) {
    try {
        var newGeo = new Geometry();
        newGeo.ctm = this.oGeo.ctm.translate(0,0)
        mdx = 0
        mdy = 0
        if(type == 'x' ||  type=='y'){
            mdx = Math.round(this.shapeX.value *this.canvas.zoom - newGeo.ctm.e);
            mdy = Math.round(this.shapeY.value *this.canvas.zoom - newGeo.ctm.f);
            var matrix = this.oGeo.ctm.inverse();
            dx = matrix.a * mdx + matrix.c * mdy;
            dy = matrix.b * mdx + matrix.d * mdy ;
            //translate
            newGeo.ctm = this.oGeo.ctm.translate(dx, dy);
        }
        //rotate
        //if(type == 'a') {
        //    matrix = this.borderRect.ownerSVGElement.createSVGTransform().matrix;
        //    matrix = matrix.rotate(this.shapeA.value / 180 * Math.PI);
        //    newGeo.ctm = newGeo.ctm.multiply(matrix);
        //}
        //change dimension
        newGeo.dim = new Dimension(this.shapeWidth.value*this.canvas.zoom, this.shapeHeight.value *this.canvas.zoom);
        this.setEditorGeometry(newGeo);
        this.canvas.setZoomedGeo(this.targetObject, this.geo);
        this.canvas.invalidateEditors(this);
    } finally {
        this.currentAnchor = null;
    }
};
GeometryEditor.prototype.nextTool = function () {
    var next = (this.tool == "scale") ? "rotate" : "scale";
    
    this.setTool(next);
};
GeometryEditor.prototype.setTool = function (tool) {
    this.tool = tool;
    this.svgElement.setAttribute("class", "GeoEditor Tool_" + this.tool);
};
GeometryEditor.prototype.handleMouseMove = function (event) {
    event.preventDefault();
    
    if (!this.currentAnchor) return;
    
    var locking = this.getLockingPolicy();
    
    if (this.tool == "rotate") {
        if (!locking.rotation) {
            this.rotate(new Point(this.oX, this.oY), new Point(event.clientX, event.clientY), event);
        }
        return;
    }
    
    
    var uPoint1 = Svg.vectorInCTM(new Point(this.oX, this.oY), this.geo.ctm);
    var uPoint2 = Svg.vectorInCTM(new Point(event.clientX, event.clientY), this.geo.ctm);
    
    var matrix = this.currentAnchor._matrix;
    var t = event.shiftKey ? {x: 1, y: 1} : this.getGridSize(); //Svg.vectorInCTM(this.getGridSize(), this.geo.ctm, true);
    var grid = {w: t.x * this.canvas.zoom, h: t.y * this.canvas.zoom};
    
    var e = this._e;
    var f = this._f;
    
    var mdx = uPoint2.x - uPoint1.x;
    var mdy = uPoint2.y - uPoint1.y;
    
    //FIXME: this is a temp. implementation for ratio locking
    if (locking.ratio) {
        if (matrix.dw) {
            mdy = mdx;
        } else if (matrix.dh) {
            mdx = mdy;
        }
    }
    
    var newGeo = new Geometry();

    var dx = 0;
    var dw = 0;
    var dy = 0;
    var dh = 0;
    
    //HORIZONTAL
    if (!locking.width) {
        dx = matrix.dx * mdx;
        dw = matrix.dw * mdx;
        //console.log([dx, dw]);
        
        //console.log(["before:  ", dx, dw]);
        if (matrix.dx != 0) {
            var newX = e + dx;
            var newXNormalized = Util.gridNormalize(newX, grid.w);
            if (newXNormalized > this._maxX1) newXNormalized = this._maxX1;
            
            var delta = newXNormalized - newX;
            
            dx += delta;
            dw -= delta;
            //console.log(["<--", e, newX, newXNormalized, delta, dx, dw]);
        } else {
            var newX2 = e + this._w + dw;
            var newX2Normalized = Util.gridNormalize(newX2, grid.w);
            if (newX2Normalized < this._minX2) newX2Normalized = this._minX2;
            
            var delta = newX2Normalized - newX2;
            
            dw += delta;
            //console.log(["-->", newX2, newX2Normalized, delta, dx, dw]);
        }
    }
    
    if (!locking.height && (matrix.dh != 0) ) {
        dy = matrix.dy * mdy;
        dh = matrix.dh * mdy;
        
        if (matrix.dy != 0) {
            var newY = f + dy;
            var newYNormalized = Util.gridNormalize(newY, grid.h);
            if (newYNormalized > this._maxY1) newYNormalized = this._maxY1;
            
            var delta = newYNormalized - newY;
            
            dy += delta;
            dh -= delta;
        } else {
            var newY2 = f + this._h + dh;
            var newY2Normalized = Util.gridNormalize(newY2, grid.h);
            if (newY2Normalized < this._minY2) newY2Normalized = this._minY2;
            
            var delta = newY2Normalized - newY2;
            
            dh += delta;
        }
    }
    
    
    
    
    //this.currentAnchor = null;
    
    newGeo.ctm = this.oGeo.ctm.translate(dx, dy);
    newGeo.dim = new Dimension(Math.round(this.oGeo.dim.w + dw), Math.round(this.oGeo.dim.h + dh));
    
    
    //validate the bound using the current policies
    //TODO: revalidate this
    
//    this.validateGeometry(newGeo, matrix, locking);
    //this.debugText.nodeValue = [newBound.x, newBound.y, newBound.w, newBound.h].toString();
        
    this.setEditorGeometry(newGeo);
};
GeometryEditor.prototype.handleMouseMove_old = function (event) {
    event.preventDefault();
    
    if (!this.currentAnchor) return;
    
    var locking = this.getLockingPolicy();
    
    if (this.tool == "rotate") {
        if (!locking.rotation) {
            this.rotate(new Point(this.oX, this.oY), new Point(event.clientX, event.clientY), event);
        }
        return;
    }
    
    
    var uPoint1 = Svg.vectorInCTM(new Point(this.oX, this.oY), this.geo.ctm);
    var uPoint2 = Svg.vectorInCTM(new Point(event.clientX, event.clientY), this.geo.ctm);
    
    
    dx = uPoint2.x - uPoint1.x;
    dy = uPoint2.y - uPoint1.y;
    
    var newGeo = new Geometry();
    
    var matrix = this.currentAnchor._matrix;
    //this.currentAnchor = null;
    
    dx = (locking.width || (locking.x && matrix.dx != 0)) ? 0 : dx;
    
    dy = (locking.height || (locking.y && matrix.dy != 0)) ? 0 : dy;
    
    newGeo.ctm = this.oGeo.ctm.translate(matrix.dx * dx, matrix.dy * dy);
    newGeo.dim = new Dimension(Math.round(this.oGeo.dim.w + matrix.dw * dx), Math.round(this.oGeo.dim.h + matrix.dh * dy));
    
    
    //validate the bound using the current policies
    //TODO: revalidate this
    
    this.validateGeometry(newGeo, matrix, locking);
    //this.debugText.nodeValue = [newBound.x, newBound.y, newBound.w, newBound.h].toString();
        
    this.setEditorGeometry(newGeo);
};
GeometryEditor.prototype.getLockingPolicy = function () {
    var boxPropDef = this.targetObject.def.propertyMap["box"];
    var lockW = boxPropDef ? (boxPropDef.meta.lockWidth == "true" || boxPropDef.meta.widthExpr) : false;
    var lockH = boxPropDef ? (boxPropDef.meta.lockHeight == "true" || boxPropDef.meta.heightExpr) : false;
    var lockR = boxPropDef ? (boxPropDef.meta.lockRotation == "true") : false;
    var lockRatio = boxPropDef ? (boxPropDef.meta.lockRatio == "true") : false;
    
    return {x: false, y: false, width: lockW, height: lockH, rotation: lockR, ratio: lockRatio};
};
GeometryEditor.prototype.getMinDimension = function () {
    //FIXME: this value is picked up from either the current shape box constraint or the system fallback constraint
    var min = { w: 15, h: 15 };
    return min;
};
GeometryEditor.prototype.getGridSize = function () {
    //FIXME: this value is defined in either system-wide config or document-wide config
    var grid = Pencil.getGridSize();
    return { x: grid.w, y: grid.h };
};
GeometryEditor.prototype.getZoomedGridSize = function () {
    var size = this.getGridSize();
    return { x: size.x * this.canvas.zoom, y: size.y * this.canvas.zoom };
};
GeometryEditor.prototype.getRotationStep = function () {
    return 15; //degrees
};
GeometryEditor.prototype.getRotationCenterRatio = function () {
    return {rx: 0.5, ry: 0.5 };
};
GeometryEditor.prototype.getRotationCenterScreenLocation = function () {
    var point = Svg.getScreenLocation(this.borderRect);
    
    var centerRatio = this.getRotationCenterRatio();
    
    return { x: this.geo.dim.w * centerRatio.rx + point.x, y: this.geo.dim.h * centerRatio.ry + point.y};
};
GeometryEditor.prototype.rotate = function (from, to, event) {
    var centerRatio = this.getRotationCenterRatio();
/*
    var center = Svg.getScreenLocation(this.borderRect);
    center = Svg.vectorInCTM(this.getRotationCenterLocation(), this.geo.ctm);
    
    { x: this.geo.dim.w * centerRatio.rx, y:  this.geo.dim.h * centerRatio.ry}
    center.x += this.geo.dim.w * centerRatio.rx;
*/ 
    var d = this.geo.loc ? this.geo.loc : {x: 0, y: 0};
    var center = { x: this.geo.dim.w * centerRatio.rx + d.x, y:  this.geo.dim.h * centerRatio.ry + d.y};
    var centerInScreen = Svg.getScreenLocation(this.borderRect, center);
    
    
    var a = Svg.getRelativeAngle(from, to, centerInScreen);
    if (!event || !event.shiftKey) {
        var step = this.getRotationStep();
        a = Math.round(a / step) * step;
    }
    this.shapeA.value=a;
        
    var matrix = Svg.rotateMatrix(a, center, this.borderRect);
    var newGeo = new Geometry();
    newGeo.ctm = this.oGeo.ctm.multiply(matrix);
    newGeo.dim = this.geo.dim;
    newGeo.loc = this.geo.loc ? this.geo.loc : null;

    this.setEditorGeometry(newGeo);
};
GeometryEditor.prototype.validateGeometry = function (geo, matrix, locking) {

    var minDim = this.getMinDimension();
    
    var grid = this.getGridSize();
    
    grid = Svg.vectorInCTM(grid, geo.ctm, true);
    
    var tx = 0;
    var ty = 0;
    
    if (matrix.dw != 0) {
        if (matrix.dx != 0) {
            if (!locking.x) {
                var x = Math.min(geo.ctm.e, geo.ctm.e - minDim.w + geo.dim.w);
                x = x - x % grid.x;
                
                geo.dim.w = geo.dim.w + geo.ctm.e - x;
                tx = x - geo.ctm.e;
            }
        } else if (!locking.width) {
            var w = Math.max(minDim.w, geo.dim.w);
            var x2 = w + geo.ctm.e;
            if (x2 % grid.x > 0) w += (grid.x - x2 % grid.x);
            
            geo.dim.w = w;
        }
    }
    
    if (matrix.dh != 0) {
        if (matrix.dy != 0) {
            if (!locking.y) {
                var y = Math.min(geo.ctm.f, geo.ctm.f - minDim.h + geo.dim.h);
                y = y - y % grid.y;
                
                geo.dim.h = geo.dim.h + geo.ctm.f - y;
                ty = y - geo.ctm.f;
            }
        } else if (!locking.height) {
            var h = Math.max(minDim.h, geo.dim.h);
            var y2 = h + geo.ctm.f;
            if (y2 % grid.y > 0) h += (grid.y - y2 % grid.y);
            
            geo.dim.h = h;
        }
    }
    
    if (tx != 0 || ty != 0) {
        geo.ctm = geo.ctm.translate(tx, ty);
    }
    
};

Pencil.registerEditor(GeometryEditor);

