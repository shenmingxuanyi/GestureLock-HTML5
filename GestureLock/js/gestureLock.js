/***
 *  GestureLock 1.0 Zhao.Junming
 * 2015-11-11
 */

'use strict';
(function () {

    window.GestureLock = function (obj) {
        if (!obj || !obj.id) {
            throw "The GestureLock id is undefined";
            return;
        }
        this.canvas = document.getElementById(obj.id);
        this.canvas.height = obj.height;
        this.canvas.width = obj.width;
        this.matrix = obj.matrix || 3;
    };

    /***
     * 画密码圆环
     * @param point     object{x,y}  圆环的圆心坐标 X,Y
     * @param strokeStyle   string   填充颜色
     * @param lineWidth     number  线宽
     */
    GestureLock.prototype.drawCle = function (point, strokeStyle, lineWidth) {
        this.context2d.strokeStyle = strokeStyle || '#CFE6FF';
        this.context2d.lineWidth = lineWidth || 2;
        this.context2d.beginPath();
        this.context2d.arc(point.x, point.y, this.radii, 0, Math.PI * 2, true);
        this.context2d.closePath();
        this.context2d.stroke();
    };

    /***
     * 画密码圆环
     * @param points    Array<object{x,y}>
     * @param strokeStyle   string  填充颜色
     * @param lineWidth     number  线宽
     */
    GestureLock.prototype.drawCles = function (points, strokeStyle, lineWidth) {
        for (var i = 0, n = points.length; i < n; i++) {
            this.drawCle(points[i], strokeStyle, lineWidth);
        }
    };

    /***
     * 圆心填充
     * @param fillPoints    string   填充实心点集合
     * @param fillStyle     string   填充颜色
     */
    GestureLock.prototype.drawPoint = function (point, fillStyle) {
        this.context2d.fillStyle = fillStyle || '#CFE6FF';
        this.context2d.beginPath();
        this.context2d.arc(point.x, point.y, this.radii / 2, 0, Math.PI * 2, true);
        this.context2d.closePath();
        this.context2d.fill();
    };

    /***
     * 圆心填充
     * @param fillPoints    string   填充实心点集合
     * @param fillStyle     string   填充颜色
     */
    GestureLock.prototype.drawPoints = function (points, fillStyle) {
        for (var i = 0, n = points.length; i < n; i++) {
            this.drawPoint(points[i], fillStyle);
        }
    };


    /***
     * 划线条
     * @param cipherPoints  节点集合
     * @param lineWidth number  线条宽度
     */
    GestureLock.prototype.drawLine = function (cipherPoints, lineWidth) {// 解锁轨迹
        this.context2d.beginPath();
        this.context2d.lineWidth = lineWidth || 3;

        for (var i = 0, n = cipherPoints.length; i < n; i++) {
            if (i > 0) {
                this.context2d.lineTo(cipherPoints[i].x, cipherPoints[i].y);
            } else {
                this.context2d.moveTo(cipherPoints[0].x, cipherPoints[0].y);
            }
        }
        this.context2d.stroke();
        this.context2d.closePath();

    };

    /***
     *
     * @returns {Array} 返回初始化密码单元节点坐标集合
     */

    GestureLock.prototype.createCircle = function (matrix) {
        // 创建解锁点的坐标，根据canvas的大小来平均分配半径
        matrix = matrix || 3;
        var count = 0;
        //圆环半径
        this.radii = this.canvas.width / ( 4 * matrix);// 公式计算
        //密码点集合
        this.cipherPoints = [];
        //原始点集合
        this.originalPoints = [];
        //可活动点集合：原始节点和密码几点的差集
        this.activityPoints = [];

        var r = this.radii;
        for (var i = 0; i < matrix; i++) {
            for (var j = 0; j < matrix; j++) {
                count++;
                var _o = {
                    x: j * 4 * r + 2 * r,
                    y: i * 4 * r + 2 * r,
                    index: count
                };
                this.originalPoints.push(_o);
                this.activityPoints.push(_o);
            }
        }
        //擦除面板
        this.context2d.clearRect(0, 0, this.context2d.canvas.width, this.context2d.canvas.height);
        this.drawCles(this.originalPoints)
        return this.originalPoints;
    };

    // 获取touch点相对于canvas的坐标
    GestureLock.prototype.getPosition = function (e) {
        var rect = e.currentTarget.getBoundingClientRect();
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    };

    GestureLock.prototype.init = function () {
        this.pswObj = window.localStorage.getItem('GestureLockPassword') ? {
            step: 2,
            spassword: JSON.parse(window.localStorage.getItem('GestureLockPassword'))
        } : {};
        //密码点集合
        this.cipherPoints = [];
        this.makeState();
        this.touchFlag = false;
        this.context2d = this.canvas.getContext('2d');
        this.createCircle(3);
        this.bindEvent();
    };

    GestureLock.prototype.reset = function () {
        this.makeState();
        this.createCircle(3);
    };

    /***
     *
     * @param gestureLock 手势对象
     * @param e
     */
    function touchStartController(gestureLock, e) {

        var point = gestureLock.getPosition(e);

        gestureLock.touchFlag = true;

        for (var i = 0; i < gestureLock.activityPoints.length; i++) {
            if (Math.abs(point.x - gestureLock.activityPoints[i].x) < gestureLock.radii && Math.abs(point.y - gestureLock.activityPoints[i].y) < gestureLock.radii) {
                gestureLock.cipherPoints.push(gestureLock.activityPoints[i]);
                gestureLock.activityPoints.splice(i, 1);
                //根据有效节点+当前节点重新划线
                gestureLock.drawLine(gestureLock.cipherPoints);
                //根据有效节点恢复圆心
                gestureLock.drawPoints(gestureLock.cipherPoints);
                break;
            }
        }

    }

    /***
     * touchmove事件回调 更新选中节点
     * @param gestureLock
     * @param currentPosition
     */
    function touchMoveController(gestureLock, e) {

        var currentPosition = gestureLock.getPosition(e);
        for (var i = 0; i < gestureLock.activityPoints.length; i++) {
            if (Math.abs(currentPosition.x - gestureLock.activityPoints[i].x) < gestureLock.radii && Math.abs(currentPosition.y - gestureLock.activityPoints[i].y) < gestureLock.radii) {
                gestureLock.cipherPoints.push(gestureLock.activityPoints[i]);
                gestureLock.activityPoints.splice(i, 1);
                break;
            }
        }

        //清除所有经过的划线
        gestureLock.context2d.clearRect(0, 0, gestureLock.context2d.canvas.width, gestureLock.context2d.canvas.height);

        //画出密码单元格
        gestureLock.drawCles(gestureLock.originalPoints);
        //根据有效节点+当前节点重新划线
        gestureLock.drawLine(gestureLock.cipherPoints.concat(currentPosition));
        //根据有效节点恢复圆心
        gestureLock.drawPoints(gestureLock.cipherPoints);

    };

    function touchEndController(gestureLock, e) {

        if (gestureLock.touchFlag) {
            gestureLock.touchFlag = false;

            //清除所有经过的划线
            gestureLock.context2d.clearRect(0, 0, gestureLock.context2d.canvas.width, gestureLock.context2d.canvas.height);
            //画出密码单元格
            gestureLock.drawCles(gestureLock.originalPoints);
            //根据有效节点+当前节点重新划线
            gestureLock.drawLine(gestureLock.cipherPoints);
            //根据有效节点恢复圆心
            gestureLock.drawPoints(gestureLock.cipherPoints);

            gestureLock.storePass(gestureLock.cipherPoints);
            setTimeout(function () {
                gestureLock.reset();
            }, 500);
        }

    }

    /**
     * 绑定touchstart、touchmove、touchend事件
     * */
    GestureLock.prototype.bindEvent = function () {

        var _self = this;

        document.addEventListener('touchmove', function (e) {
            //阻止document 的 touchmove事件
            e.preventDefault();
        }, false);


        this.canvas.addEventListener("touchstart", function (e) {
            //某些android的touchmove不宜触发 所以增加此行代码
            e.preventDefault();
            touchStartController(_self, e);
        }, false);

        this.canvas.addEventListener("touchmove", function (e) {
            if (_self.touchFlag) {
                touchMoveController(_self, e);
            }
        }, false);

        this.canvas.addEventListener("touchend", function (e) {
            touchEndController(_self, e);
        }, false);


        document.getElementById('updatePassword').addEventListener('click', function () {
            _self.updatePassword();
        });
        document.getElementById('updatePassword-xs').addEventListener('click', function () {
            _self.updatePassword();
        });
    };


    GestureLock.prototype.checkPass = function (psw1, psw2) {// 检测密码
        var p1 = '',
            p2 = '';
        for (var i = 0; i < psw1.length; i++) {
            p1 += psw1[i].index + psw1[i].index;
        }
        for (var i = 0; i < psw2.length; i++) {
            p2 += psw2[i].index + psw2[i].index;
        }
        console.log(JSON.stringify(psw2) + "  " + p2);
        return p1 === p2;
    };

    GestureLock.prototype.storePass = function (psw) {// touchend结束之后对密码和状态的处理
        if (this.pswObj.step == 1) {
            if (this.checkPass(this.pswObj.fpassword, psw)) {
                this.pswObj.step = 2;
                this.pswObj.spassword = psw;
                document.getElementById('title').innerHTML = '密码保存成功';
                this.drawCles(this.cipherPoints, '#2CFF26');
                window.localStorage.setItem('GestureLockPassword', JSON.stringify(this.pswObj.spassword));
                window.localStorage.setItem('matrix', this.matrix);
            } else {
                document.getElementById('title').innerHTML = '两次不一致，重新输入';
                this.drawCles(this.cipherPoints, 'red');
                delete this.pswObj.step;
            }
        } else if (this.pswObj.step == 2) {
            if (this.checkPass(this.pswObj.spassword, psw)) {
                document.getElementById('title').innerHTML = '解锁成功';
                this.drawCles(this.cipherPoints, '#2CFF26');
            } else {
                this.drawCles(this.cipherPoints, 'red');
                document.getElementById('title').innerHTML = '解锁失败';
            }
        } else {
            this.pswObj.step = 1;
            this.pswObj.fpassword = psw;
            document.getElementById('title').innerHTML = '再次输入';
        }

    };
    GestureLock.prototype.makeState = function () {
        if (this.pswObj.step == 2) {
            document.getElementById('updatePassword').style.display = 'inline';
            document.getElementById('updatePassword-xs').style.display = 'inline';

            document.getElementById('title').innerHTML = '请解锁';
        } else if (this.pswObj.step == 1) {
            document.getElementById('updatePassword').style.display = 'none';
            document.getElementById('updatePassword-xs').style.display = 'none';
        } else {
            document.getElementById('updatePassword').style.display = 'none';
            document.getElementById('updatePassword-xs').style.display = 'none';
        }
    };
    GestureLock.prototype.setmatrix = function (type) {
        this.matrix = type;
        this.init();
    };
    GestureLock.prototype.updatePassword = function () {
        window.localStorage.removeItem('GestureLockPassword');
        window.localStorage.removeItem('matrix');
        this.pswObj = {};
        document.getElementById('title').innerHTML = '绘制解锁图案';
        this.reset();
    };

})();
