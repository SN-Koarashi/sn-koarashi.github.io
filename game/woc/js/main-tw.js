(function(wHandle, wjQuery) {
    var CONNECTION_URL = "mc.snkms.com:10222";
    SKIN_URL = "https://mc.snkms.com/ogar/skins/";
    wHandle.setserver = function(arg) {
        if (arg != CONNECTION_URL) {
            CONNECTION_URL = arg;
			
			if(arg == 'mc.snkms.com:10222'){
				$('#modes').html('自由對戰');
			}
			if(arg == 'mc.snkms.com:10223'){
				$('#modes').html('團隊模式');
			}
            showConnecting();
        }
    }
    ;
    var touchX, touchY, touchable = 'createTouch'in document, touches = [];
    var leftTouchID = -1
      , leftTouchPos = new Vector2(0,0)
      , leftTouchStartPos = new Vector2(0,0)
      , leftVector = new Vector2(0,0);
    var useHttps = "https:" == wHandle.location.protocol;
    function gameLoop() {
		setInterval(function(){userScore = 0;}, 1000);
		
        ma = true;
        document.getElementById("canvas").focus();
        var isTyping = false;
        var chattxt;
        mainCanvas = nCanvas = document.getElementById("canvas");
        ctx = mainCanvas.getContext("2d");
        mainCanvas.onmousemove = function(event) {
            rawMouseX = event.clientX;
            rawMouseY = event.clientY;
            mouseCoordinateChange()
        }
        ;
        if (touchable) {
            mainCanvas.addEventListener('touchstart', onTouchStart, false);
            mainCanvas.addEventListener('touchmove', onTouchMove, false);
            mainCanvas.addEventListener('touchend', onTouchEnd, false);
        }
        mainCanvas.onmouseup = function() {}
        ;
        if (/firefox/i.test(navigator.userAgent)) {
            document.addEventListener("DOMMouseScroll", handleWheel, false);
        } else {
            document.body.onmousewheel = handleWheel;
        }
        mainCanvas.onfocus = function() {
            isTyping = false;
        }
        ;
        document.getElementById("chat_textbox").onblur = function() {
            isTyping = false;
        }
        ;
        document.getElementById("chat_textbox").onfocus = function() {
            isTyping = true;
        }
        ;
        var spacePressed = false
          , qPressed = false
          , ePressed = false
          , wPressed = false;
        wHandle.onkeydown = function(event) {
            switch (event.keyCode) {
            case 13:
                if (isTyping || hideChat) {
                    isTyping = false;
                    document.getElementById("chat_textbox").blur();
                    chattxt = document.getElementById("chat_textbox").value;
                    if (chattxt.length > 0){
                        sendChat(chattxt);
                    document.getElementById("chat_textbox").value = "";
					var snd = new Audio("sound/chat.mp3");
					snd.play();
					}
                } else {
                    if (!hasOverlay) {
                        document.getElementById("chat_textbox").focus();
                        isTyping = true;
                    }
                }
                break;
            case 32:
                if ((!spacePressed) && (!isTyping)) {
                    sendMouseMove();
                    sendUint8(17);
                    spacePressed = true;
                }
                break;
            case 87:
                if ((!wPressed) && (!isTyping)) {
                    sendMouseMove();
                    sendUint8(21);
                    wPressed = true;
                }
                break;
            case 81:
                if ((!qPressed) && (!isTyping)) {
                    sendUint8(18);
                    qPressed = true;
                }
                break;
            case 69:
                if (!isTyping) {
                    sendMouseMove();
                    sendUint8(21);
                }
                break;
            case 27:
                showOverlays(true);
                break;
            }
        }
        ;
        wHandle.onkeyup = function(event) {
            switch (event.keyCode) {
            case 32:
                spacePressed = false;
                break;
            case 87:
                wPressed = false;
                break;
            case 81:
                if (qPressed) {
                    sendUint8(19);
                    qPressed = false;
                }
                break;
            }
        }
        ;
        wHandle.onblur = function() {
            sendUint8(19);
            wPressed = spacePressed = qPressed = ePressed = false
        }
        ;
        wHandle.onresize = canvasResize;
        canvasResize();
        if (wHandle.requestAnimationFrame) {
            wHandle.requestAnimationFrame(redrawGameScene);
        } else {
            setInterval(drawGameScene, 1E3 / 60);
        }
        setInterval(sendMouseMove, 40);
        null == ws && showConnecting();
        wjQuery("#overlays").show();
    }
    function onTouchStart(e) {
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            if ((leftTouchID < 0) && (touch.clientX < canvasWidth / 2)) {
                leftTouchID = touch.identifier;
                leftTouchStartPos.reset(touch.clientX, touch.clientY);
                leftTouchPos.copyFrom(leftTouchStartPos);
                leftVector.reset(0, 0);
            }
            var size = ~~(canvasWidth / 7);
            if ((touch.clientX > canvasWidth - size) && (touch.clientY > canvasHeight - size)) {
                sendMouseMove();
                sendUint8(17);
            }
            if ((touch.clientX > canvasWidth - size) && (touch.clientY > canvasHeight - 2 * size - 10) && (touch.clientY < canvasHeight - size - 10)) {
                sendMouseMove();
                sendUint8(21);
            }
        }
        touches = e.touches;
    }
    function onTouchMove(e) {
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            if (leftTouchID == touch.identifier) {
                leftTouchPos.reset(touch.clientX, touch.clientY);
                leftVector.copyFrom(leftTouchPos);
                leftVector.minusEq(leftTouchStartPos);
                rawMouseX = leftVector.x * 3 + canvasWidth / 2;
                rawMouseY = leftVector.y * 3 + canvasHeight / 2;
                mouseCoordinateChange();
                sendMouseMove();
            }
        }
        touches = e.touches;
    }
    function onTouchEnd(e) {
        touches = e.touches;
        for (var i = 0; i < e.changedTouches.length; i++) {
            var touch = e.changedTouches[i];
            if (leftTouchID == touch.identifier) {
                leftTouchID = -1;
                leftVector.reset(0, 0);
                break;
            }
        }
    }
    function handleWheel(event) {
        zoom *= Math.pow(.9, event.wheelDelta / -120 || event.detail || 0);
        0.2 > zoom && (zoom = 0.2);
        zoom > 4 / viewZoom && (zoom = 4 / viewZoom)
    }
    function buildQTree() {
        if (.4 > viewZoom)
            qTree = null;
        else {
            var a = Number.POSITIVE_INFINITY
              , b = Number.POSITIVE_INFINITY
              , c = Number.NEGATIVE_INFINITY
              , d = Number.NEGATIVE_INFINITY
              , e = 0;
            for (var i = 0; i < nodelist.length; i++) {
                var node = nodelist[i];
                if (node.shouldRender() && !node.prepareData && 20 < node.size * viewZoom) {
                    e = Math.max(node.size, e);
                    a = Math.min(node.x, a);
                    b = Math.min(node.y, b);
                    c = Math.max(node.x, c);
                    d = Math.max(node.y, d);
                }
            }
            qTree = Quad.init({
                minX: a - (e + 100),
                minY: b - (e + 100),
                maxX: c + (e + 100),
                maxY: d + (e + 100),
                maxChildren: 2,
                maxDepth: 4
            });
            for (i = 0; i < nodelist.length; i++) {
                node = nodelist[i];
                if (node.shouldRender() && !(20 >= node.size * viewZoom)) {
                    for (a = 0; a < node.points.length; ++a) {
                        b = node.points[a].x;
                        c = node.points[a].y;
                        b < nodeX - canvasWidth / 2 / viewZoom || c < nodeY - canvasHeight / 2 / viewZoom || b > nodeX + canvasWidth / 2 / viewZoom || c > nodeY + canvasHeight / 2 / viewZoom || qTree.insert(node.points[a]);
                    }
                }
            }
        }
    }
    function mouseCoordinateChange() {
        X = (rawMouseX - canvasWidth / 2) / viewZoom + nodeX;
        Y = (rawMouseY - canvasHeight / 2) / viewZoom + nodeY
    }
    function hideOverlays() {
        hasOverlay = false;
        wjQuery("#overlays").hide();
    }
    function showOverlays(arg) {
        hasOverlay = true;
        userNickName = null;
        wjQuery("#overlays").fadeIn(arg ? 200 : 3E3);
    }
    function showConnecting() {
        if (ma) {
            wjQuery("#connecting").show();
            wsConnect((useHttps ? "wss://" : "ws://") + CONNECTION_URL)
        }
    }
    function wsConnect(wsUrl) {
        if (ws) {
            ws.onopen = null;
            ws.onmessage = null;
            ws.onclose = null;
            try {
                ws.close()
            } catch (b) {}
            ws = null
        }
        var c = CONNECTION_URL;
        wsUrl = (useHttps ? "wss://" : "ws://") + c;
        nodesOnScreen = [];
        playerCells = [];
        nodes = {};
        taymir = 0;
        nodelist = [];
        Cells = [];
        leaderBoard = [];
        mainCanvas = teamScores = null;
        userScore = 0;
        ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        ws.onopen = onWsOpen;
        ws.onmessage = onWsMessage;
        ws.onclose = onWsClose;
    }
    function prepareData(a) {
        return new DataView(new ArrayBuffer(a))
    }
    function wsSend(a) {
        ws.send(a.buffer)
    }
    function onWsOpen() {
        var msg;
        delay = 500;
        wjQuery("#connecting").hide();
        msg = prepareData(5);
        msg.setUint8(0, 254);
        msg.setUint32(1, 5, true);
        wsSend(msg);
        msg = prepareData(5);
        msg.setUint8(0, 255);
        msg.setUint32(1, 0, true);
        wsSend(msg);
        sendNickName();
    }
    function onWsClose() {
        setTimeout(showConnecting, delay);
        delay *= 1.5;
    }
    function onWsMessage(msg) {
        handleWsMessage(new DataView(msg.data));
    }
    function handleWsMessage(msg) {
        function getString() {
            var text = '', char;
            while ((char = msg.getUint16(offset, true)) != 0) {
                offset += 2;
                text += String.fromCharCode(char);
            }
            offset += 2;
            return text;
        }
        var offset = 0
          , setCustomLB = false;
        240 == msg.getUint8(offset) && (offset += 5);
        switch (msg.getUint8(offset++)) {
        case 16:
            updateNodes(msg, offset);
            break;
        case 17:
            posX = msg.getFloat32(offset, true);
            offset += 4;
            posY = msg.getFloat32(offset, true);
            offset += 4;
            posSize = msg.getFloat32(offset, true);
            offset += 4;
            break;
        case 20:
            playerCells = [];
            nodesOnScreen = [];
            break;
        case 21:
            lineX = msg.getInt16(offset, true);
            offset += 2;
            lineY = msg.getInt16(offset, true);
            offset += 2;
            if (!drawLine) {
                drawLine = true;
                drawLineX = lineX;
                drawLineY = lineY;
            }
            break;
        case 32:
            nodesOnScreen.push(msg.getUint32(offset, true));
            offset += 4;
            break;
        case 31:
            ping = Math.floor(Date.now() - pingtaym);
            break;
        case 48:
            setCustomLB = true;
            noRanking = true;
            break;
        case 49:
            if (!setCustomLB) {
                noRanking = false;
            }
            teamScores = null;
            var LBplayerNum = msg.getUint32(offset, true);
            offset += 4;
            leaderBoard = [];
            for (i = 0; i < LBplayerNum; ++i) {
                var nodeId = msg.getUint32(offset, true);
                offset += 4;
                leaderBoard.push({
                    id: nodeId,
                    name: getString()
                })
            }
            drawLeaderBoard();
            break;
        case 50:
            teamScores = [];
            var LBteamNum = msg.getUint32(offset, true);
            offset += 4;
            for (var i = 0; i < LBteamNum; ++i) {
                teamScores.push(msg.getFloat32(offset, true));
                offset += 4;
            }
            drawLeaderBoard();
            break;
        case 64:
            leftPos = msg.getFloat64(offset, true);
            offset += 8;
            topPos = msg.getFloat64(offset, true);
            offset += 8;
            rightPos = msg.getFloat64(offset, true);
            offset += 8;
            bottomPos = msg.getFloat64(offset, true);
            offset += 8;
            posX = (rightPos + leftPos) / 2;
            posY = (bottomPos + topPos) / 2;
            posSize = 1;
            if (0 == playerCells.length) {
                nodeX = posX;
                nodeY = posY;
                viewZoom = posSize;
            }
            break;
        case 96:
            taymir = msg.getUint16(offset, true);
            break;
        case 99:
            addChat(msg, offset);
            break;
        }
    }
    function addChat(view, offset) {
        function getString() {
            var text = '', char;
            while ((char = view.getUint16(offset, true)) != 0) {
                offset += 2;
                text += String.fromCharCode(char);
            }
            offset += 2;
            return text;
        }
        var flags = view.getUint8(offset++);
        if (flags & 0x80) {}
        if (flags & 0x40) {}
        if (flags & 0x20) {}
        var r = view.getUint8(offset++)
          , g = view.getUint8(offset++)
          , b = view.getUint8(offset++)
          , color = (r << 16 | g << 8 | b).toString(16);
        while (color.length < 6) {
            color = '0' + color;
        }
        color = '#' + color;
        chatBoard.push({
            "name": asddc(getString())[1],
            "color": color,
            "message": getString(),
            "time": Date.now()
        });
        drawChatBoard();
    }
    function drawChatBoard() {
        if (hideChat) {
            chatCanvas = null;
            return;
        }
        chatCanvas = document.createElement("canvas");
        var ctx = chatCanvas.getContext("2d");
        var scaleFactor = Math.min(Math.max(canvasWidth / 1200, 0.75), 1);
        //chatCanvas.width = 1E3 * scaleFactor;
        //chatCanvas.height = 550 * scaleFactor;
        chatCanvas.width = 1E3;
        chatCanvas.height = 550;
        ctx.scale(scaleFactor, scaleFactor);
        var nowtime = Date.now();
        var lasttime = 0;
        if (chatBoard.length >= 1)
            lasttime = chatBoard[chatBoard.length - 1].time;
        else
            return;
        var deltat = nowtime - lasttime;
        ctx.globalAlpha = 0.8 * Math.exp(-deltat / 25000);
        var len = chatBoard.length;
        var from = len - 15;
        if (from < 0)
            from = 0;
        for (var i = 0; i < (len - from); i++) {
            var chatName = new UText(18,chatBoard[i + from].color);
            chatName.setValue(chatBoard[i + from].name);
            var width = chatName.getWidth();
            var a = chatName.render();
            ctx.drawImage(a, 15, chatCanvas.height / scaleFactor - 24 * (len - i - from));
            var chatText = new UText(18,'#666666');
            chatText.setValue(':' + chatBoard[i + from].message);
            a = chatText.render();
            ctx.drawImage(a, 15 + width * 0.6, chatCanvas.height / scaleFactor - 24 * (len - from - i));
        }
    }
    function updateNodes(view, offset) {
        timestamp = +new Date;
        var code = Math.random();
        ua = false;
        var queueLength = view.getUint16(offset, true);
        offset += 2;
        for (i = 0; i < queueLength; ++i) {
            var killer = nodes[view.getUint32(offset, true)]
              , killedNode = nodes[view.getUint32(offset + 4, true)];
            offset += 8;
            if (killer && killedNode) {
                killedNode.destroy();
                killedNode.ox = killedNode.x;
                killedNode.oy = killedNode.y;
                killedNode.oSize = killedNode.size;
                killedNode.nx = killer.x;
                killedNode.ny = killer.y;
                killedNode.nSize = killedNode.size;
                killedNode.updateTime = timestamp;
                var colduren_kontrol = -1 != nodesOnScreen.indexOf(killer.id)
                  , oldurulen_kontrol = -1 != nodesOnScreen.indexOf(killedNode.id)
                  , boyut_kontrol = 80 > killedNode.size;
                colduren_kontrol && boyut_kontrol && ++foodEaten;

				//console.log("food!!");
            }
        }
        for (var i = 0; ; ) {
            var nodeid = view.getUint32(offset, true);
            offset += 4;
            if (0 == nodeid)
                break;
            ++i;
            var size, posY, posX = view.getInt32(offset, true);
            offset += 4;
            posY = view.getInt32(offset, true);
            offset += 4;
            size = view.getInt16(offset, true);
            offset += 2;
            for (var r = view.getUint8(offset++), g = view.getUint8(offset++), b = view.getUint8(offset++), color = (r << 16 | g << 8 | b).toString(16); 6 > color.length; )
                color = "0" + color;
            var colorstr = "#" + color
              , flags = view.getUint8(offset++)
              , flagVirus = !!(flags & 0x01)
              , flagEjected = !!(flags & 0x20)
              , flagAgitated = !!(flags & 0x10)
              , _skin = "";
            flags & 2 && (offset += 4);
            if (flags & 4) {
                for (; ; ) {
                    t = view.getUint8(offset, true) & 0x7F;
                    offset += 1;
                    if (0 == t)
                        break;
                    _skin += String.fromCharCode(t);
                }
            }
            for (var char, name = ""; ; ) {
                char = view.getUint16(offset, true);
                offset += 2;
                if (0 == char)
                    break;
                name += String.fromCharCode(char);
            }
            var node = null;
            if (nodes.hasOwnProperty(nodeid)) {
                node = nodes[nodeid];
                node.updatePos();
                node.ox = node.x;
                node.oy = node.y;
                node.oSize = node.size;
                node.color = colorstr;
            } else {
                node = new Cell(nodeid,posX,posY,size,colorstr,name,_skin);
                nodelist.push(node);
                nodes[nodeid] = node;
                node.ka = posX;
                node.la = posY;
            }
            node.isVirus = flagVirus;
            node.isEjected = flagEjected;
            node.isAgitated = flagAgitated;
            node.nx = posX;
            node.ny = posY;
            node.setSize(size);
            node.updateCode = code;
            node.updateTime = timestamp;
            node.flag = flags;
            name && node.setName(name);
            if (-1 != nodesOnScreen.indexOf(nodeid) && -1 == playerCells.indexOf(node)) {
                document.getElementById("overlays").style.display = "none";
                playerCells.push(node);
                if (1 == playerCells.length) {
                    nodeX = node.x;
                    nodeY = node.y;
                }
            }
        }
        queueLength = view.getUint32(offset, true);
        offset += 4;
        for (i = 0; i < queueLength; i++) {
            var nodeId = view.getUint32(offset, true);
            offset += 4;
            node = nodes[nodeId];
            null != node && node.destroy();
        }
        ua && 0 == playerCells.length && (showOverlays(false)
		)
    }
    function sendMouseMove() {
        var msg;
        if (wsIsOpen()) {
            msg = rawMouseX - canvasWidth / 2;
            var b = rawMouseY - canvasHeight / 2;
            if (64 <= msg * msg + b * b && !(.01 > Math.abs(oldX - X) && .01 > Math.abs(oldY - Y))) {
                oldX = X;
                oldY = Y;
                msg = prepareData(21);
                msg.setUint8(0, 16);
                msg.setFloat64(1, X, true);
                msg.setFloat64(9, Y, true);
                msg.setUint32(17, 0, true);
                wsSend(msg);
            }
        }
    }
    function sendNickName() {
        if (wsIsOpen() && null != userNickName) {
            var msg = prepareData(1 + 2 * userNickName.length);
            msg.setUint8(0, 0);
            for (var i = 0; i < userNickName.length; ++i)
                msg.setUint16(1 + 2 * i, userNickName.charCodeAt(i), true);
            wsSend(msg)
        }
    }
    function sendChat(str) {
        if (wsIsOpen() && (str.length < 200) && (str.length > 0) && !hideChat) {
            var msg = prepareData(2 + 2 * str.length);
            var offset = 0;
            msg.setUint8(offset++, 99);
            msg.setUint8(offset++, 0);
            for (var i = 0; i < str.length; ++i) {
                msg.setUint16(offset, str.charCodeAt(i), true);
                offset += 2;
            }
            wsSend(msg);
        }
    }
    function wsIsOpen() {
        return null != ws && ws.readyState == ws.OPEN
    }
    function sendUint8(a) {
        if (wsIsOpen()) {
            var msg = prepareData(1);
            msg.setUint8(0, a);
            wsSend(msg)
        }
    }
    function redrawGameScene() {
        drawGameScene();
        wHandle.requestAnimationFrame(redrawGameScene)
    }
    function canvasResize() {
        window.scrollTo(0,0);
        canvasWidth = wHandle.innerWidth;
        canvasHeight = wHandle.innerHeight;
        nCanvas.width = canvasWidth;
        nCanvas.height = canvasHeight;

        var hello = wjQuery("#helloDialog");
        hello.css("transform", "none");
        var modalHeight = hello.height();
        modalHeight > canvasHeight / 1.1 ? hello.css("transform", "translate(-50%, -50%) scale(" + canvasHeight / modalHeight / 1.1 + ")") : hello.css("transform", "translate(-50%, -50%)");
        drawGameScene();
    }

    function viewRange() {
        var ratio;
        ratio = Math.max(canvasHeight / 1080, canvasWidth / 1920);
        return ratio * zoom;
    }

    function calcViewZoom() {
        if (0 != playerCells.length) {
            for (var newViewZoom = 0, i = 0; i < playerCells.length; i++) newViewZoom += playerCells[i].size;
            newViewZoom = Math.pow(Math.min(64 / newViewZoom, 1), .4) * viewRange();
            viewZoom = (9 * viewZoom + newViewZoom) / 10
        }
    }
    function drawGameScene() {
        var a, oldtime = Date.now();
        ++cb;
        timestamp = oldtime;
        if (0 < playerCells.length) {
            calcViewZoom();
            var c = a = 0;
            for (var d = 0; d < playerCells.length; d++) {
                playerCells[d].updatePos();
                a += playerCells[d].x / playerCells.length;
                c += playerCells[d].y / playerCells.length;
            }
            posX = a;
            posY = c;
            posSize = viewZoom;
            nodeX = (nodeX + a) / 2;
            nodeY = (nodeY + c) / 2
        } else {
            nodeX = (29 * nodeX + posX) / 30;
            nodeY = (29 * nodeY + posY) / 30;
            viewZoom = (9 * viewZoom + posSize * viewRange()) / 10;
        }
        buildQTree();
        mouseCoordinateChange();
        xa || ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (xa) {
            if (showDarkTheme) {
                ctx.fillStyle = '#111111';
                ctx.globalAlpha = .05;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = '#F2FBFF';
                ctx.globalAlpha = .05;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.globalAlpha = 1;
            }
        } else {
            drawGrid();
        }
        nodelist.sort(function(a, b) {
            return a.size === b.size ? a.id - b.id : a.size - b.size
        });
        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        ctx.scale(viewZoom, viewZoom);
        ctx.translate(-nodeX, -nodeY);
        ctx.strokeStyle = '#A52A2A';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(leftPos, topPos);
        ctx.lineTo(rightPos, topPos);
        ctx.lineTo(rightPos, bottomPos);
        ctx.lineTo(leftPos, bottomPos);
        ctx.closePath();
        ctx.stroke();
        for (d = 0; d < Cells.length; d++)
            Cells[d].drawOneCell(ctx);
        for (d = 0; d < nodelist.length; d++)
            nodelist[d].drawOneCell(ctx);
        if (drawLine) {
            drawLineX = (3 * drawLineX + lineX) /
                4;
            drawLineY = (3 * drawLineY + lineY) / 4;
            ctx.save();
            ctx.strokeStyle = "#FFAAAA";
            ctx.lineWidth = 10;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.globalAlpha = .5;
            ctx.beginPath();
            for (d = 0; d < playerCells.length; d++) {
                ctx.moveTo(playerCells[d].x, playerCells[d].y);
                ctx.lineTo(drawLineX, drawLineY);
            }
            ctx.stroke();
            ctx.restore()
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#E6A200";
        ctx.font = "30px Arial";
        var a = "";
		
        ctx.fillText(a, 0.5 * (canvasWidth - ctx.measureText(a).width), 35);
        lbCanvas && lbCanvas.width && ctx.drawImage(lbCanvas, canvasWidth - lbCanvas.width - 10, 10);
        if (chatCanvas != null)
            ctx.drawImage(chatCanvas, 0, canvasHeight - chatCanvas.height - 50);
        userScore = Math.max(userScore, calcUserScore());
        if (0 != userScore) {
            if (null == scoreText) {
                scoreText = new UText(24,'#fff');
            }
			if($.cookie('highScore')){
				if((userScore / 100) > (atob($.cookie('highScore')))){
					$.cookie('highScore',(btoa(userScore / 100)), { expires: 365, path: '/woc' });
				}
			}
			else{
				$.cookie('highScore','MTA=', { expires: 365, path: '/woc' });
			}
			
            scoreText.setValue('Score: ' + ~~(userScore / 100) + '  Food: ' + foodEaten);
            c = scoreText.render();
            a = c.width;
            ctx.globalAlpha = .2;
            ctx.fillStyle = '#000000';
            ctx.fillRect(10, 10, a + 10, 34);
            ctx.globalAlpha = 1;
            ctx.drawImage(c, 15, 15);
        }
        drawSplitIcon(ctx);
        drawTouch(ctx);
        var deltatime = Date.now() - oldtime;
        deltatime > 1E3 / 60 ? z -= .01 : deltatime < 1E3 / 65 && (z += .01);
        .4 > z && (z = .4);
        1 < z && (z = 1)
    }
    function drawTouch(ctx) {
        ctx.save();
        if (touchable) {
            for (var i = 0; i < touches.length; i++) {
                var touch = touches[i];
                if (touch.identifier == leftTouchID) {
                    ctx.beginPath();
                    ctx.strokeStyle = "#0096ff";
                    ctx.lineWidth = 6;
                    ctx.arc(leftTouchStartPos.x, leftTouchStartPos.y, 40, 0, Math.PI * 2, true);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = "#0096ff";
                    ctx.lineWidth = 2;
                    ctx.arc(leftTouchStartPos.x, leftTouchStartPos.y, 60, 0, Math.PI * 2, true);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.strokeStyle = "#0096ff";
                    ctx.arc(leftTouchPos.x, leftTouchPos.y, 40, 0, Math.PI * 2, true);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.beginPath();
                    ctx.strokeStyle = "#0096ff";
                    ctx.lineWidth = "6";
                    ctx.arc(touch.clientX, touch.clientY, 40, 0, Math.PI * 2, true);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
    function drawGrid() {
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.save();
        ctx.strokeStyle = "#AAAAAA";
        ctx.globalAlpha = .2;
        ctx.scale(viewZoom, viewZoom);
        var a = canvasWidth / viewZoom,
            b = canvasHeight / viewZoom;
        for (var c = -.5 + (-nodeX + a / 2) % 50; c < a; c += 50) {
            ctx.beginPath();
            ctx.moveTo(c, 0);
            ctx.lineTo(c, b);
            ctx.stroke();
        }
        for (c = -.5 + (-nodeY + b / 2) % 50; c < b; c += 50) {
            ctx.beginPath();
            ctx.moveTo(0, c);
            ctx.lineTo(a, c);
            ctx.stroke();
        }
        ctx.restore()
    }
    function drawSplitIcon(ctx) {
        if (isTouchStart && splitIcon.width) {
            var size = ~~(canvasWidth / 7);
            ctx.drawImage(splitIcon, canvasWidth - size, canvasHeight - size, size, size);
        }
        if (isTouchStart && splitIcon.width) {
            var size = ~~(canvasWidth / 7);
            ctx.drawImage(ejectIcon, canvasWidth - size, canvasHeight - 2 * size - 10, size, size);
        }
    }
    function calcUserScore() {
        for (var score = 0, i = 0; i < playerCells.length; i++)
            score += playerCells[i].nSize * playerCells[i].nSize;
        return score
    }
    function asddc(c, a) {
        if (-1 != c.indexOf("{") & -1 != c.indexOf("}")) {
            var b = c.indexOf("{")
              , d = c.indexOf("}")
              , e = c.slice(d + 1);
            a && (e = "" == e ? "細胞" : c.slice(d + 1));
            return [c.slice(b + 1, d), e]
        }
        return ["", c]
    }
    function drawLeaderBoard() {
        lbCanvas = null;
        var drawTeam = null != teamScores;
        if (drawTeam || 0 != leaderBoard.length)
            if (drawTeam || showName) {
                lbCanvas = document.createElement("canvas");
                var ctx = lbCanvas.getContext("2d")
                  , boardLength = 70;
                boardLength = !drawTeam ? boardLength + 24 * leaderBoard.length : boardLength + 180;
                var scaleFactor = Math.min(0.22 * canvasHeight, Math.min(200, .3 * canvasWidth)) / 150;
                lbCanvas.width = 200 * scaleFactor;
                lbCanvas.height = boardLength * scaleFactor;
                ctx.scale(scaleFactor, scaleFactor);
                ctx.globalAlpha = .2;
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, 200, boardLength);

                ctx.globalAlpha = 1;
                ctx.fillStyle = "#FFFFFF";
                var c = "排 行 榜";
                ctx.font = "30px Ubuntu";
                ctx.fillText(c, 100 - ctx.measureText(c).width / 2, 40);
                var b, l;
                if (!drawTeam) {
                    for (ctx.font = "20px Ubuntu",
                    b = 0,
                    l = leaderBoard.length; b < l; ++b) {
                        c = leaderBoard[b].name || "細胞";
                        if (!showName) {
                            (c = "細胞");
                        }
                        var me = -1 != nodesOnScreen.indexOf(leaderBoard[b].id);
                        if (me){
                            playerCells[0].name && (c = asddc(playerCells[0].name, 1)[1]);
							ctx.fillStyle = "#FFAAAA";
						}
						else{
							if((b+1)==1){
							ctx.fillStyle = "#FFF700";	
							}
							else if((b+1)==2){
							ctx.fillStyle = "#FFBF00";	
							}
							else if((b+1)==3){
							ctx.fillStyle = "#84FF00";	
							}
							else{
                            ctx.fillStyle = "#FFFFFF";
							}
						}
                        if (!noRanking)
                            c = b + 1 + ". " + asddc(c, 1)[1];
                        var start = (ctx.measureText(c).width > 200) ? 2 : 100 - ctx.measureText(c).width * 0.5;
                        ctx.fillText(c, start, 70 + 24 * b);
                    }
                } else {
                    for (b = c = 0; b < teamScores.length; ++b) {
                        var d = c + teamScores[b] * Math.PI * 2;
                        ctx.fillStyle = teamColor[b + 1];
                        ctx.beginPath();
                        ctx.moveTo(100, 140);
                        ctx.arc(100, 140, 80, c, d, false);
                        ctx.fill();
                        c = d
                    }
                }
            }
    }
    function Cell(uid, ux, uy, usize, ucolor, uname, a) {
        this.id = uid;
        this.ox = this.x = ux;
        this.oy = this.y = uy;
        this.oSize = this.size = usize;
        this.color = ucolor;
        this.points = [];
        this.pointsAcc = [];
        this.createPoints();
        this.setName(uname)
        this._skin = a;
    }
    function UText(usize, ucolor, ustroke, ustrokecolor) {
        usize && (this._size = usize);
        ucolor && (this._color = ucolor);
        this._stroke = !!ustroke;
        ustrokecolor && (this._strokeColor = ustrokecolor)
    }
    var localProtocol = wHandle.location.protocol
      , localProtocolHttps = "https:" == localProtocol;
    var nCanvas, ctx, mainCanvas, lbCanvas, chatCanvas, canvasWidth, canvasHeight, qTree = null, ws = null, nodeX = 0, nodeY = 0, nodesOnScreen = [], foodEaten = 0, playerCells = [], nodes = {}, nodelist = [], Cells = [], pingtaym = 0, ping = 0, taymir = 0, leaderBoard = [], chatBoard = [], rawMouseX = 0, rawMouseY = 0, X = -1, Y = -1, cb = 0, timestamp = 0, userNickName = null, leftPos = 0, topPos = 0, rightPos = 1E4, bottomPos = 1E4, viewZoom = 1, showSkin = true, showName = true, showColor = false, ua = false, userScore = 0, showDarkTheme = false, showMass = true, hideChat = false, smoothRender = .4, posX = nodeX = ~~((leftPos + rightPos) / 2), posY = nodeY = ~~((topPos + bottomPos) / 2), posSize = 1, teamScores = null, ma = false, hasOverlay = true, drawLine = false, lineX = 0, lineY = 0, drawLineX = 0, drawLineY = 0, Ra = 0, teamColor = ["#333333", "#FF3333", "#33FF33", "#3333FF"], xa = false, zoom = 1, isTouchStart = "ontouchstart"in wHandle && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent), splitIcon = new Image, ejectIcon = new Image, noRanking = false;
    splitIcon.src = "splits.png";
    ejectIcon.src = "feeds.png";
    var wCanvas = document.createElement("canvas");
    var playerStat = null;
    wHandle.isSpectating = false;
    wHandle.setNick = function(name, skin) {
        hideOverlays();
        userNickName = skin ? "{" + skin + "}" + name : name;
        sendNickName();
        userScore = 0
    }
    ;
    wHandle.setSkins = function(arg) {
        showSkin = arg
    }
    ;
    wHandle.setNames = function(arg) {
        showName = arg
    }
    ;
    wHandle.setDarkTheme = function(arg) {
        showDarkTheme = arg
    }
    ;
    wHandle.setColors = function(arg) {
        showColor = arg
    }
    ;
    wHandle.setShowMass = function(arg) {
        showMass = arg
    }
    ;
    wHandle.setSmooth = function(arg) {
        smoothRender = arg ? 2 : .4
    }
    ;
    wHandle.setChatHide = function(arg) {
        hideChat = arg;
        if (hideChat) {
            wjQuery('#chat_textbox').hide();
        } else {
            wjQuery('#chat_textbox').show();
        }
    }
    wHandle.spectate = function() {
        userNickName = null;
        wHandle.isSpectating = true;
        sendUint8(1);
        hideOverlays()
    }
    ;
    wHandle.setAcid = function(arg) {
        xa = arg
    }
    ;
    wHandle.connect = wsConnect;
    var data = {
        "action": "test"
    };
    wjQuery.ajax({
        type: "POST",
        dataType: "json",
        url: "https://mc.snkms.com/ogar/checkdir.php",
        data: data,
        success: function(data) {
            response = JSON.parse(data["names"]);
            for (var i = 0; i < response.length; i++) {
                if (-1 == knownNameDict.indexOf(response[i])) {
                    knownNameDict.push(response[i]);
                }
            }
        }
    });
    var delay = 500
      , oldX = -1
      , oldY = -1
      , Canvas = null
      , z = 1
      , scoreText = null
      , skins = {}
      , knownNameDict = "8;ball;bomb;bug;china;doge;donuts;dragon;earth;egg;eye;face;facebook;facepunch;goldbag;japan;mars;moon;mouse;mushroom;nasa;nuclear;origin;pizza;russia;snowman;spy;taiwan;usa;none".split(";")
      , knownNameDict_noDisp = ['none']
      , ib = ["_canvas'blob"];
    Cell.prototype = {
        id: 0,
        points: null,
        pointsAcc: null,
        name: null,
        nameCache: null,
        sizeCache: null,
        x: 0,
        y: 0,
        size: 0,
        ox: 0,
        oy: 0,
        oSize: 0,
        nx: 0,
        ny: 0,
        nSize: 0,
        flag: 0,
        updateTime: 0,
        updateCode: 0,
        drawTime: 0,
        destroyed: false,
        isVirus: false,
        isEjected: false,
        isAgitated: false,
        wasSimpleDrawing: true,
        destroy: function() {
            var tmp;
            for (tmp = 0,
            len = nodelist.length; tmp < len; tmp++)
                if (nodelist[tmp] === this) {
                    nodelist.splice(tmp, 1);
                    break
                }
            delete nodes[this.id];
            tmp = playerCells.indexOf(this);
            if (-1 != tmp) {
                ua = true;
                playerCells.splice(tmp, 1);
            }
            tmp = nodesOnScreen.indexOf(this.id);
            if (-1 != tmp)
                nodesOnScreen.splice(tmp, 1);
            this.destroyed = true;
            Cells.push(this)
        },
        getNameSize: function() {
            return Math.max(~~(.3 * this.size), 24)
        },
        setName: function(a) {
            this.name = a;
            if (null == this.nameCache) {
                this.nameCache = new UText(this.getNameSize(),"#FFFFFF",true,"#000000");
                this.nameCache.setValue(this.name);
            } else {
                this.nameCache.setSize(this.getNameSize());
                this.nameCache.setValue(this.name);
            }
        },
        setSize: function(a) {
            this.nSize = a;
            var m = ~~(this.size * this.size * 0.01);
            if (null === this.sizeCache)
                this.sizeCache = new UText(this.getNameSize() * 0.5,"#FFFFFF",true,"#000000");
            else
                this.sizeCache.setSize(this.getNameSize() * 0.5);
        },
        createPoints: function() {
            for (var samplenum = this.getNumPoints(); this.points.length > samplenum; ) {
                var rand = ~~(Math.random() * this.points.length);
                this.points.splice(rand, 1);
                this.pointsAcc.splice(rand, 1)
            }
            if (0 == this.points.length && 0 < samplenum) {
                this.points.push({
                    ref: this,
                    size: this.size,
                    x: this.x,
                    y: this.y
                });
                this.pointsAcc.push(Math.random() - .5);
            }
            while (this.points.length < samplenum) {
                var rand2 = ~~(Math.random() * this.points.length)
                  , point = this.points[rand2];
                this.points.splice(rand2, 0, {
                    ref: this,
                    size: point.size,
                    x: point.x,
                    y: point.y
                });
                this.pointsAcc.splice(rand2, 0, this.pointsAcc[rand2])
            }
        },
        getNumPoints: function() {
            if (0 == this.id)
                return 16;
            var a = 10;
            if (20 > this.size)
                a = 0;
            if (this.isVirus)
                a = 30;
            var b = this.size;
            if (!this.isVirus)
                (b *= viewZoom);
            b *= z;
            if (this.flag & 32)
                (b *= .25);
            return ~~Math.max(b, a);
        },
        movePoints: function() {
            this.createPoints();
            for (var points = this.points, pointsacc = this.pointsAcc, numpoints = points.length, i = 0; i < numpoints; ++i) {
                var pos1 = pointsacc[(i - 1 + numpoints) % numpoints]
                  , pos2 = pointsacc[(i + 1) % numpoints];
                pointsacc[i] += (Math.random() - .5) * (this.isAgitated ? 3 : 1);
                pointsacc[i] *= .7;
                10 < pointsacc[i] && (pointsacc[i] = 10);
                -10 > pointsacc[i] && (pointsacc[i] = -10);
                pointsacc[i] = (pos1 + pos2 + 8 * pointsacc[i]) / 10
            }
            for (var ref = this, isvirus = this.isVirus ? 0 : (this.id / 1E3 + timestamp / 1E4) % (2 * Math.PI), j = 0; j < numpoints; ++j) {
                var f = points[j].size
                  , e = points[(j - 1 + numpoints) % numpoints].size
                  , m = points[(j + 1) % numpoints].size;
                if (15 < this.size && null != qTree && 20 < this.size * viewZoom && 0 != this.id) {
                    var l = false
                      , n = points[j].x
                      , q = points[j].y;
                    qTree.retrieve2(n - 5, q - 5, 10, 10, function(a) {
                        if (a.ref != ref && 25 > (n - a.x) * (n - a.x) + (q - a.y) * (q - a.y)) {
                            l = true;
                        }
                    });
                    if (!l && points[j].x < leftPos || points[j].y < topPos || points[j].x > rightPos || points[j].y > bottomPos) {
                        l = true;
                    }
                    if (l) {
                        if (0 < pointsacc[j]) {
                            (pointsacc[j] = 0);
                        }
                        pointsacc[j] -= 1;
                    }
                }
                f += pointsacc[j];
                0 > f && (f = 0);
                f = this.isAgitated ? (19 * f + this.size) / 20 : (12 * f + this.size) / 13;
                points[j].size = (e + m + 8 * f) / 10;
                e = 2 * Math.PI / numpoints;
                m = this.points[j].size;
                this.isVirus && 0 == j % 2 && (m += 5);
                points[j].x = this.x + Math.cos(e * j + isvirus) * m;
                points[j].y = this.y + Math.sin(e * j + isvirus) * m
            }
        },
        updatePos: function() {
            if (0 == this.id)
                return 1;
            var a;
            a = (timestamp - this.updateTime) / 120;
            a = 0 > a ? 0 : 1 < a ? 1 : a;
            var b = 0 > a ? 0 : 1 < a ? 1 : a;
            this.getNameSize();
            if (this.destroyed && 1 <= b) {
                var c = Cells.indexOf(this);
                -1 != c && Cells.splice(c, 1)
            }
            this.x = a * (this.nx - this.ox) + this.ox;
            this.y = a * (this.ny - this.oy) + this.oy;
            this.size = b * (this.nSize - this.oSize) + this.oSize;
            return b;
        },
        shouldRender: function() {
            if (0 == this.id) {
                return true
            } else {
                return !(this.x + this.size + 40 < nodeX - canvasWidth / 2 / viewZoom || this.y + this.size + 40 < nodeY - canvasHeight / 2 / viewZoom || this.x - this.size - 40 > nodeX + canvasWidth / 2 / viewZoom || this.y - this.size - 40 > nodeY + canvasHeight / 2 / viewZoom);
            }
        },
        getStrokeColor: function() {
            var r = (~~(parseInt(this.color.substr(1, 2), 16) * 0.9)).toString(16)
              , g = (~~(parseInt(this.color.substr(3, 2), 16) * 0.9)).toString(16)
              , b = (~~(parseInt(this.color.substr(5, 2), 16) * 0.9)).toString(16);
            if (r.length == 1)
                r = "0" + r;
            if (g.length == 1)
                g = "0" + g;
            if (b.length == 1)
                b = "0" + b;
            return "#" + r + g + b;
        },
        drawOneCell: function(ctx) {
            if (this.shouldRender()) {
                var b = (0 != this.id && !this.isVirus && !this.isAgitated && smoothRender > viewZoom);
                if (10 > this.getNumPoints())
                    b = true;
                if (this.wasSimpleDrawing && !b)
                    for (var c = 0; c < this.points.length; c++)
                        this.points[c].size = this.size;
                var bigPointSize = this.size;
                if (!this.wasSimpleDrawing) {
                    for (var c = 0; c < this.points.length; c++)
                        bigPointSize = Math.max(this.points[c].size, bigPointSize);
                }
                this.wasSimpleDrawing = b;
                ctx.save();
                this.drawTime = timestamp;
                c = this.updatePos();
                this.destroyed && (ctx.globalAlpha *= 1 - c);
                ctx.lineWidth = 10;
                ctx.lineCap = "round";
                ctx.lineJoin = this.isVirus ? "miter" : "round";
                if (showColor) {
                    ctx.fillStyle = "#FFFFFF";
                    ctx.strokeStyle = "#AAAAAA";
                } else {
                    ctx.fillStyle = this.color;
                    if (b)
                        ctx.strokeStyle = this.getStrokeColor();
                    else
                        ctx.strokeStyle = this.color;
                }
                ctx.beginPath();
                if (b) {
                    var lw = this.size * 0.03;
                    ctx.lineWidth = lw;
                    ctx.arc(this.x, this.y, this.size - lw * 0.5 + 5, 0, 2 * Math.PI, false);
                    ctx.stroke();
                } else {
                    this.movePoints();
                    ctx.beginPath();
                    var d = this.getNumPoints();
                    ctx.moveTo(this.points[0].x, this.points[0].y);
                    for (c = 1; c <= d; ++c) {
                        var e = c % d;
                        ctx.lineTo(this.points[e].x, this.points[e].y);
                    }
                }
                ctx.closePath();
                var skinName = this.name.toLowerCase();
                skinName = asddc(skinName)[0];
                if (typeof this._skin != 'undefined' && this._skin != '') {
                    if (this._skin[0] == '%') {
                        skinName = this._skin.substring(1);
                    }
                }
                if (showSkin && skinName != '' && -1 != knownNameDict.indexOf(skinName)) {
                    if (!skins.hasOwnProperty(skinName)) {
                        skins[skinName] = new Image;
                        skins[skinName].src = SKIN_URL + skinName + '.png';
                    }
                    if (0 != skins[skinName].width && skins[skinName].complete) {
                        c = skins[skinName];
                    } else {
                        c = null;
                    }
                } else {
                    c = null;
                }
                b || ctx.stroke();
                ctx.fill();
                if (c) {
                    ctx.save();
                    ctx.clip();
                    ctx.drawImage(c, this.x - bigPointSize, this.y - bigPointSize, 2 * bigPointSize, 2 * bigPointSize);
                    ctx.restore();
                }
                if ((showColor || 15 < this.size) && !b) {
                    ctx.strokeStyle = '#000000';
                    ctx.globalAlpha *= .1;
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                c = -1 != playerCells.indexOf(this);
                var ncache;
                if (0 != this.id) {
                    var x = ~~this.x
                      , y = ~~this.y
                      , nz = this.getNameSize()
                      , ratio =  Math.ceil(10 * viewZoom) / 10
                      , ratD = 1 / ratio;
                    if ((showName || c) && this.name && this.nameCache && (null == e || -1 == knownNameDict_noDisp.indexOf(skinName))) {
                        ncache = this.nameCache;
                        ncache.setValue(asddc(this.name)[1]);
                        ncache.setSize(nz);
                        ncache.setScale(ratio);
                        var rnchache = ncache.render()
                          , m = ~~(rnchache.width * ratD)
                          , h = ~~(rnchache.height * ratD);
                        ctx.drawImage(rnchache, x - ~~(m * 0.5), y - ~~(h * 0.5), m, h);
                        b += rnchache.height * 0.5 * ratio + 4;
                    }
                    if (showMass && (c || 0 == playerCells.length && (!this.isVirus || this.isAgitated) && 20 < this.size)) {
                        var m = ~~(this.size * this.size * 0.01);
                        c = this.sizeCache;
                        c.setValue(m);
                        c.setScale(ratio);
                        e = c.render();
                        m = ~~(e.width * ratD);
                        h = ~~(e.height * ratD);
                        var g = this.name ? y + ~~(h * 0.7) : y - ~~(h * 0.5);
                        ctx.drawImage(e, x - ~~(m * 0.5), g, m, h);
                    }
                }
                ctx.restore();
            }
        }
    };
    UText.prototype = {
        _value: "",
        _color: "#000000",
        _stroke: false,
        _strokeColor: "#000000",
        _size: 16,
        _canvas: null,
        _ctx: null,
        _dirty: false,
        _scale: 1,
        setSize: function(a) {
            if (this._size != a) {
                this._size = a;
                this._dirty = true;
            }
        },
        setScale: function(a) {
            if (this._scale != a) {
                this._scale = a;
                this._dirty = true;
            }
        },
        setStrokeColor: function(a) {
            if (this._strokeColor != a) {
                this._strokeColor = a;
                this._dirty = true;
            }
        },
        setValue: function(a) {
            if (a != this._value) {
                this._value = a;
                this._dirty = true;
            }
        },
        render: function() {
            if (null == this._canvas) {
                this._canvas = document.createElement("canvas");
                this._ctx = this._canvas.getContext("2d");
            }
            if (this._dirty) {
                this._dirty = false;
                var canvas = this._canvas
                  , ctx = this._ctx
                  , value = this._value
                  , scale = this._scale
                  , fontsize = this._size
                  , font = fontsize + 'px Arial';
                ctx.font = font;
                var h = ~~(.2 * fontsize)
                  , wd = fontsize * 0.1;
                var h2 = h * 0.5;
                canvas.width = ctx.measureText(value).width * scale + 3;
                canvas.height = (fontsize + h) * scale;
                ctx.font = font;
                ctx.globalAlpha = 1;
                ctx.lineWidth = wd;
                ctx.strokeStyle = this._strokeColor;
                ctx.fillStyle = this._color;
                ctx.scale(scale, scale);
                this._stroke && ctx.strokeText(value, 0, fontsize - h2);
                ctx.fillText(value, 0, fontsize - h2);
            }
            return this._canvas
        },
        getWidth: function() {
            return (ctx.measureText(this._value).width + 6);
        }
    };
    Date.now || (Date.now = function() {
        return (new Date).getTime()
    }
    );
    var Quad = {
        init: function(args) {
            function Node(x, y, w, h, depth) {
                this.x = x;
                this.y = y;
                this.w = w;
                this.h = h;
                this.depth = depth;
                this.items = [];
                this.nodes = []
            }
            var c = args.maxChildren || 2
              , d = args.maxDepth || 4;
            Node.prototype = {
                x: 0,
                y: 0,
                w: 0,
                h: 0,
                depth: 0,
                items: null,
                nodes: null,
                exists: function(selector) {
                    for (var i = 0; i < this.items.length; ++i) {
                        var item = this.items[i];
                        if (item.x >= selector.x && item.y >= selector.y && item.x < selector.x + selector.w && item.y < selector.y + selector.h)
                            return true
                    }
                    if (0 != this.nodes.length) {
                        var self = this;
                        return this.findOverlappingNodes(selector, function(dir) {
                            return self.nodes[dir].exists(selector)
                        })
                    }
                    return false;
                },
                retrieve: function(item, callback) {
                    for (var i = 0; i < this.items.length; ++i)
                        callback(this.items[i]);
                    if (0 != this.nodes.length) {
                        var self = this;
                        this.findOverlappingNodes(item, function(dir) {
                            self.nodes[dir].retrieve(item, callback)
                        })
                    }
                },
                insert: function(a) {
                    if (0 != this.nodes.length) {
                        this.nodes[this.findInsertNode(a)].insert(a);
                    } else {
                        if (this.items.length >= c && this.depth < d) {
                            this.devide();
                            this.nodes[this.findInsertNode(a)].insert(a);
                        } else {
                            this.items.push(a);
                        }
                    }
                },
                findInsertNode: function(a) {
                    return a.x < this.x + this.w / 2 ? a.y < this.y + this.h / 2 ? 0 : 2 : a.y < this.y + this.h / 2 ? 1 : 3
                },
                findOverlappingNodes: function(a, b) {
                    return a.x < this.x + this.w / 2 && (a.y < this.y + this.h / 2 && b(0) || a.y >= this.y + this.h / 2 && b(2)) || a.x >= this.x + this.w / 2 && (a.y < this.y + this.h / 2 && b(1) || a.y >= this.y + this.h / 2 && b(3)) ? true : false
                },
                devide: function() {
                    var a = this.depth + 1
                      , c = this.w / 2
                      , d = this.h / 2;
                    this.nodes.push(new Node(this.x,this.y,c,d,a));
                    this.nodes.push(new Node(this.x + c,this.y,c,d,a));
                    this.nodes.push(new Node(this.x,this.y + d,c,d,a));
                    this.nodes.push(new Node(this.x + c,this.y + d,c,d,a));
                    a = this.items;
                    this.items = [];
                    for (c = 0; c < a.length; c++)
                        this.insert(a[c])
                },
                clear: function() {
                    for (var a = 0; a < this.nodes.length; a++)
                        this.nodes[a].clear();
                    this.items.length = 0;
                    this.nodes.length = 0
                }
            };
            var internalSelector = {
                x: 0,
                y: 0,
                w: 0,
                h: 0
            };
            return {
                root: new Node(args.minX,args.minY,args.maxX - args.minX,args.maxY - args.minY,0),
                insert: function(a) {
                    this.root.insert(a)
                },
                retrieve: function(a, b) {
                    this.root.retrieve(a, b)
                },
                retrieve2: function(a, b, c, d, callback) {
                    internalSelector.x = a;
                    internalSelector.y = b;
                    internalSelector.w = c;
                    internalSelector.h = d;
                    this.root.retrieve(internalSelector, callback)
                },
                exists: function(a) {
                    return this.root.exists(a)
                },
                clear: function() {
                    this.root.clear()
                }
            }
        }
    };
    wjQuery(function() {
        function renderFavicon() {
            if (0 < playerCells.length) {
                redCell.color = playerCells[0].color;
                redCell.setName(playerCells[0].name);
            }
            ctx.clearRect(0, 0, 32, 32);
            ctx.save();
            ctx.translate(16, 16);
            ctx.scale(.4, .4);
            redCell.drawOneCell(ctx);
            ctx.restore();
            var favicon = document.getElementById("favicon")
              , oldfavicon = favicon.cloneNode(true);
            oldfavicon.setAttribute("href", favCanvas.toDataURL("image/png"));
            favicon.parentNode.replaceChild(oldfavicon, favicon)
        }
        var redCell = new Cell(0,0,0,32,"#ED1C24","")
          , favCanvas = document.createElement("canvas");
        favCanvas.width = 32;
        favCanvas.height = 32;
        var ctx = favCanvas.getContext("2d");
        renderFavicon();
        setInterval(drawChatBoard, 1E3);
        setInterval(function() {
            sendUint8(31);
            pingtaym = Date.now()
        }, 500);
    });
    wHandle.onload = gameLoop
}
)(window, window.jQuery);