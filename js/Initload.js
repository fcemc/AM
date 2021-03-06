﻿var tryingToReconnect = false, user, scanResult = 0, permission = 0;
var serviceURL = "https://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/";

$(document).ready(function () {
    //adjust for status bar in iOS
    if (/iPad|iPod|iPhone/i.test(navigator.userAgent)) {
        $("body").css("background-color", "black");
        $("div[role='dialog']").css("background-color", "#efecec");
        $(".pg").css({ "margin-top": "20px" });
    }

    $("#page1content a").css('margin-bottom', '20px');


    if (navigator.onLine) {
        checkCookie();
        getSpinner();
        $("#spinCont").hide();

        toastr.options = {
            "closeButton": false,
            "debug": false,
            "newestOnTop": false,
            "progressBar": false,
            "positionClass": "toast-bottom-right",
            "preventDuplicates": false,
            "onclick": null,
            "showDuration": "0",
            "hideDuration": "0",
            "timeOut": "5000",
            "extendedTimeOut": "1000",
            "showEasing": "swing",
            "hideEasing": "linear",
            "showMethod": "fadeIn",
            "hideMethod": "fadeOut"
        }


    }
    else {
        if (navigator.notification.confirm("No network connection detected, check settings and try again!", networkIssue, "Please Confirm:", "Cancel, Ok")) {
            window.location.reload();
        }
        else {
            $.mobile.pageContainer.pagecontainer("change", "#pageLogin");
        }
    }

    $("#memgridContainer").hide();
    $("#memgrid").wijgrid({
        allowSorting: false,
        scrollMode: "auto",
        columns: [
            {
                cellFormatter: function (args) {
                    if (args.formattedValue > 0) {
                        if (args.row.type & $.wijmo.wijgrid.rowType.data) { // data row (not group header) 
                            var img = $("<img/>")
                                .attr("src", "img/check24x24.png") // flag url 
                            //.attr("height", "100");         // image size 
                            args.$container
                                .css("text-align", "center")    // center the flag 
                                .empty()                        // remove original content 
                                .append(img);                   // add image element 
                            return true;                        // content has been customized 
                        }
                    }
                    else if (args.formattedValue == 0) {
                        args.$container
                                .css("text-align", "center")    // center the flag 
                                .empty()                        // remove original content 
                                .append(img);                   // add image element 
                        return true;                        // content has been customized 
                    }
                }, ensureColumnsPxWidth: false,
            },
            { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
            { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
            { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
            { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
            { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
            { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
            { textAlignment: "center", ensureColumnsPxWidth: false, }

        ],
        cellClicked: function (e, args) {
            if (args.cell._wijgrid != null) {
                args.cell._ci = 0;
                $("#memberData").empty();
                var memData = [];
                for (var m = 0; m < $("#memgrid").wijgrid("columns").length; m++) {
                    args.cell._ci = m;
                    var title = args.cell.column().headerText;
                    var value = args.cell.value();
                    memData.push(title + "|" + value);
                }
                $("body").pagecontainer("change", "#checkInPage");
                beginCheckIn(memData);
            }
        }
    });

    $("#memgrid").wijgrid('columns')[0].option('width', '80px');
    $("#memgrid").wijgrid('columns')[7].option('width', '80px');

    $("#member-autocomplete-input").on("input", getMember);

    $(".memberSearch").on("click", function () {
        $("#member-autocomplete-input").blur();
        $("#member-autocomplete-input").val("");
        $("#memgridContainer").hide();

        if (this.value == "TELEPHONE" || this.value == "MBRSEP" || this.value === "MBRNO") {
            $("#member-autocomplete-input").prop('type', 'number');
        }
        else {
            $("#member-autocomplete-input").prop('type', '');
        }
        $("#member-autocomplete-input").focus();
    });

    $("#radio-single").on("click", clearProxyInfo);
    $("#radio-nonmemproxy").on("click", clearProxyInfo);
    $("#radio-proxy").on("click", showProxyView);

    $("#cancelCheckin").on("click", function () {
        if ($("#logmem_VOTE").text() == "No") {
            if (navigator.notification != undefined) {
                navigator.notification.confirm("Member is not registered do you want to continue!", quitRegistration, "Please Confirm:", "No, Yes");
            }
            else {
                alert("Member is not registered do you want to continue!");
                resetForm();
            }
        }
        else {
            resetForm();
        }
    });

    $("a").on("click", function () {
        if ($(this).context.innerText === "Back to Main Page") {
            resetForm();
        }
    });

    $("#saveCheckin").on("click", function () {
        $("#spinCont").show();
        preLogMemberIn();
    });

    $("#person").css("text-align", "center");
    $("#nonperson").css("text-align", "center");

    $("body").keydown(function () {
        if (event.keyCode == 13) {
            document.activeElement.blur();
            return false;
        }
    });

    $("#lightSwitch").on("click", function () {
        if (this.checked === true) {            
            $("#lightSwitchLbl").html("Light on when scanning");
        }
        else {                        
            $("#lightSwitchLbl").html("Light off when scanning");            
        }
    });

});

//region Login&Cookies
function checkLogin() {
    //$.mobile.pageContainer.pagecontainer("change", "#page1");

    if ($("#un").val() != "" && $("#pw").val() != "") {
        user = $("#un").val().trim();
        var _pw = $("#pw").val().trim();
        var paramItems = user + "|" + _pw;

        $.ajax({
            type: "GET",
            url: serviceURL + "authenticateYouSir/" + paramItems,
            contentType: "application/json; charset=utf-8",
            cache: false,
            success: function (results) {
                if (results.authenticateYouSirResult) {
                    $("#loginError").text("");

                    $.mobile.pageContainer.pagecontainer("change", "#page1");
                    if (localStorage.fcemcInventory_uname == undefined || localStorage.fcemcInventory_uname == "") {
                        setCookie(user, _pw, 1); //expires 1 day from inital login
                    }

                    checkPermissions(user);
                }
                else {
                    //window.localStorage.clear();
                    localStorage.setItem("fcemcInventory_uname", "");
                    localStorage.setItem("fcemcInventory_pass", "");

                    $("#loginError").text("Login Unsucessful");
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                var e = errorThrown;
                if (!(navigator.onLine)) {
                    $("#loginError").text("No network connection - cannot login!");
                }
                else {
                    $("#loginError").text("Login Unsucessful");
                }
            }
        });
    }
}

function setCookie(u, p, t) {
    //window.localStorage.clear();
    localStorage.setItem("fcemcInventory_uname", u);
    localStorage.setItem("fcemcInventory_pass", p);
    var d = new Date();
    d.setDate(d.getDate() + t);
    d.setHours(6);
    d.setMinutes(00);
    d.setSeconds(00);
    localStorage.setItem("fcemcInventory_timeout", d);
}

function getCookie() {
    var isCookies = false;
    if (localStorage.fcemcInventory_uname != null && localStorage.fcemcInventory_pass != null && localStorage.fcemcInventory_uname != "" && localStorage.fcemcInventory_pass != "" && new Date(localStorage.fcemcInventory_timeout) > new Date()) {
        isCookies = true;
    }
    return isCookies;
}

function checkCookie() {
    if (localStorage.fcemcInventory_scanning != "true") {
        var valid = getCookie();
        if (valid == true) {
            $("#un").val(localStorage.fcemcInventory_uname);
            $("#pw").val(localStorage.fcemcInventory_pass);
        }
        else {
            localStorage.setItem("fcemcInventory_uname", "");
            localStorage.setItem("fcemcInventory_pass", "");
            $(":mobile-pagecontainer").pagecontainer("change", "#pageLogin");
        }
    }
}

function checkPermissions(user) {
    $.ajax({
        type: "GET",
        url: serviceURL + "AM_PERM/" + user,
        contentType: "application/json; charset=utf-8",
        cache: false,
        success: function (results) {
            permission = results.AM_PERMResult;
        },
        error: function (jqXHR, textStatus, errorThrown) {
            var e = errorThrown;
            if (!(navigator.onLine)) {
                $("#loginError").text("No network connection - cannot login!");
            }
            else {
                $("#loginError").text("Login Unsucessful");
            }
        }
    });
}
//endregion

//region lookup region
function scan() {
    try {
        $("#scanText").text("");
        localStorage.setItem("fcemcInventory_scanning", true);

        //if ($("#lightSwitch").is(':checked')) {
        //    scanlight(true);
        //}

        cordova.plugins.barcodeScanner.scan(
          function (result) {
              //scanlight(false);
              if (result.cancelled != 1) {
                  getMemberScanInfo(result.text.trim(result.text));
              }
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          function (error) {
              //scanlight(false);
              $("#scanText").text("Scanning Member failed: " + error);
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          {              
              "preferFrontCamera": false, // iOS and Android
              "showFlipCameraButton": true, // iOS and Android
              "prompt": "Place a barcode inside the scan area", // supported on Android only
              //"formats": "QR_CODE,PDF_417", // default: all but PDF_417 and RSS_EXPANDED
              "orientation": "portrait" // Android only (portrait|landscape), default unset so it rotates with the device
          }
       );
    }
    catch (err) {
        alert(err.message.toString());
    }
}

//function scanlight(enable) {
//    window.plugins.flashlight.available(function (isAvailable) {
//        if (isAvailable) {
//            if (enable) {
//                window.plugins.flashlight.switchOn(
//                   function () { },
//                    function () { },
//                    { intensity: 0.3 }
//                );
//            } else {
//                window.plugins.flashlight.switchOff();
//            }
//        }
//    });
//}

function getSpinner() {
    var opts = {
        lines: 12             // The number of lines to draw
        , length: 7             // The length of each line
        , width: 5              // The line thickness
        , radius: 10            // The radius of the inner circle
        , scale: 1.0            // Scales overall size of the spinner
        , corners: 1            // Roundness (0..1)
        , color: '#000'         // #rgb or #rrggbb
        , opacity: 1 / 4          // Opacity of the lines
        , rotate: 0             // Rotation offset
        , direction: 1          // 1: clockwise, -1: counterclockwise
        , speed: 1              // Rounds per second
        , trail: 100            // Afterglow percentage
        , fps: 20               // Frames per second when using setTimeout()
        , zIndex: 2e9           // Use a high z-index by default
        , className: 'spinner'  // CSS class to assign to the element
        , top: '50%'            // center vertically
        , left: '50%'           // center horizontally
        , shadow: false         // Whether to render a shadow
        , hwaccel: false        // Whether to use hardware acceleration (might be buggy)
        , position: 'absolute'  // Element positioning
    }
    var target = document.getElementById('spinwheel');
    spinner = new Spinner(opts).spin(target);
}

function networkIssue(button) {
    if (button == 2) {
        window.location.reload();
    }
    else if (button == 1) {
        $.mobile.pageContainer.pagecontainer("change", "#pageLogin");
    }
}

function quitRegistration(button) {
    if (button == 2) {
        resetForm();
    }
    else if (button == 1) {

    }
}

function fakeCallback() { }
//endregion

//manual lookup region
function getMember(scanResult) {
    if ($("#member-autocomplete-input").val().length >= 1) {
        var v = $("#member-autocomplete-input").val();
        var f;
        $("input.memberSearch[type=radio]").each(function () {
            if (this.checked === true) {
              f = this.value;
            }
        });
        getMemberInfo(f + "|" + v);
    }
    else if ($("#member-autocomplete-input").val().length === 0) {
        $("#spinCont").hide();
        $("#memgridContainer").hide();
    }
}

function getMemberScanInfo(paramItems) {
    $.ajax({
        type: "GET",
        url: serviceURL + "MEMBERLISTSCAN/" + paramItems,
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var results = result.MEMBERLISTSCANResult;
            $("#memberData").empty();
            if (results.length == 1) {
                if (results[0].VOTE == null) {
                    var memData = [];
                    memData.push("VOTE|0");
                    memData.push("NAME|" + checkNull(results[0].NAME));
                    memData.push("MEMBERNO|" + checkNull(results[0].MEMBERNO));
                    memData.push("MEMBERSEP|" + checkNull(results[0].MEMBERSEP));
                    memData.push("BILLADDR|" + checkNull(results[0].BILLADDR));
                    memData.push("SERVADDR|" + checkNull(results[0].SERVADDR));
                    memData.push("PHONE|" + checkNull(results[0].PHONE));
                    memData.push("MAPNUMBER|" + checkNull(results[0].MAPNUMBER));
                    memData.push("METER|" + checkNull(results[0].METER));
                    memData.push("PROXY|");
                    //memData.push("PTYPE|''");
                    beginCheckIn(memData);
                    $("body").pagecontainer("change", "#checkInPage");
                }
                else if (results[0].VOTE.toString() != "0") {
                    var memData = [];
                    memData.push("VOTE|" + checkNull(results[0].VOTE));
                    memData.push("NAME|" + checkNull(results[0].NAME));
                    memData.push("MEMBERNO|" + checkNull(results[0].MEMBERNO));
                    memData.push("MEMBERSEP|" + checkNull(results[0].MEMBERSEP));
                    memData.push("BILLADDR|" + checkNull(results[0].BILLADDR));
                    memData.push("SERVADDR|" + checkNull(results[0].SERVADDR));
                    memData.push("PHONE|" + checkNull(results[0].PHONE));
                    memData.push("MAPNUMBER|" + checkNull(results[0].MAPNUMBER));
                    memData.push("METER|" + checkNull(results[0].METER));
                    memData.push("PROXY|" + checkNull(results[0].PROXY));
                    //memData.push("PTYPE|''");
                    beginCheckIn(memData);
                    $("body").pagecontainer("change", "#checkInPage");
                }
            }
            else if (results.length > 1) {
                //just in case there are duplicate MBRSEP numbers        
                var memData = [];
                for (var i = 0; i < results.length; i++) {
                    memData.push({ MAPNUMBER: results[i].MAPNUMBER, METER: results[i].METER, VOTE: results[i].VOTE, NAME: results[i].NAME, MEMBERNO: results[i].MEMBERNO, MEMBERSEP: results[i].MEMBERSEP, BILLADDR: results[i].BILLADDR, SERVADDR: results[i].SERVADDR, PHONE: results[i].PHONE, PROXY: results[i].PROXY })
                }
                $("#memgridContainer").show();
                $("#memgrid").wijgrid("option", "data", memData);
                $("#memgrid").wijgrid({
                    columns: [
                            { visible: false },
                            { visible: false },
                            {
                                cellFormatter: function (args) {
                                    if (args.formattedValue == 1) {
                                        if (args.row.type & $.wijmo.wijgrid.rowType.data) { // data row (not group header) 
                                            var img = $("<img/>")
                                                .attr("src", "img/check24x24.png") // flag url 
                                            //.attr("height", "100");         // image size 
                                            args.$container
                                                .css("text-align", "left")    // center the flag 
                                                .empty()                        // remove original content 
                                                .append(img);                   // add image element 
                                            return true;                        // content has been customized 
                                        }
                                    }
                                    else if (args.formattedValue == 0) {
                                        args.$container
                                                .css("text-align", "center")    // center the flag 
                                                .empty()                        // remove original content 
                                                .append(img);                   // add image element 
                                        return true;                        // content has been customized 
                                    }
                                }
                            }]
                });
                $(".wijmo-wijgrid-headerrow th div").css("background-color", "#0D914F");
            }
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            //var txt = textStatus;
            //var et = errorThrown;
        }
    });
}

function getMemberInfo(paramItems) {
    $.ajax({
        type: "GET",
        url: serviceURL + "MEMBERLIST/" + paramItems,
        contentType: "application/json; charset=utf-8",
        dataType: 'jsonp',
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var results = result.MEMBERLISTResult;
            var data = [];
            for (var i = 0; i < results.length; i++) {
                if (results[i].VOTE != null) {
                    data.push({ VOTE: results[i].VOTE, NAME: results[i].NAME, MEMBERNO: results[i].MEMBERNO, MEMBERSEP: results[i].MEMBERSEP, BILLADDR: results[i].BILLADDR, SERVADDR: results[i].SERVADDR, PHONE: results[i].PHONE, PROXY: results[i].PROXY });
                }
                else if (results[i].VOTE == null) {
                    data.push({ VOTE: "0", NAME: results[i].NAME, MEMBERNO: results[i].MEMBERNO, MEMBERSEP: results[i].MEMBERSEP, BILLADDR: results[i].BILLADDR, SERVADDR: results[i].SERVADDR, PHONE: results[i].PHONE, PROXY: results[i].PROXY });
                }
            }
            $("#memgridContainer").show();
            $("#memgrid").wijgrid("option", "data", data);
            $(".wijmo-wijgrid-headerrow th div").css("background-color", "#0D914F");

            $(".ui-mobile .wijmo-wijgrid .wijmo-wijgrid-headerrow .wijmo-wijgrid-headertext").css("padding-left", "").css("padding-right", "0px");
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });
}

function beginCheckIn(memData) {
    for (var i = 0; i < memData.length; i++) {
        if (memData[i].toString().split("|")[0] == "VOTE") {
            if (memData[i].toString().split("|")[1] == "0") {
                $("#memberData").append("<div><b>REGISTERED</b>: <label  style='display:inline-block' id='logmem_VOTE'>No</label></div>");
            }
            else if (memData[i].toString().split("|")[1] != "0") {
                if (permission == 10) {
                    $("#memberData").append("<div><button onclick='unregisterMemeber();' id='unregMember' style='background-color: black;' class='ui-btn ui-btn-b ui-btn-inline ui-mini ui-corner-all'>Unregister Member</button></div>");
                }
                $("#memberData").append("<div><b>REGISTERED</b>: <label  style='display:inline-block' id='logmem_VOTE'>Yes</label></div>");
            }
        }
        else {
            $("#memberData").append("<div><b>" + memData[i].toString().split("|")[0] + "</b>: <label  style='display:inline-block' id='logmem_" + memData[i].toString().split("|")[0] + "'>" + memData[i].toString().split("|")[1] + "</label></div>");
        }
    }

    switch (memData[0].toString().split("|")[1]) {
        case "0":
            checkForProxy(memData[3].toString().split("|")[1]);
            break;
        case "1":
            checkForProxy(memData[3].toString().split("|")[1]);
            break;
        case "2":
            checkForProxy(memData[3].toString().split("|")[1]);
            break;
        case "3":
            $("#radio-single").checkboxradio("disable");
            $("#radio-nonmemproxy").checkboxradio("disable");
            $("#radio-proxy").checkboxradio("disable");
            break;
        case "4":
            $("#radio-single").checkboxradio("disable");
            $("#radio-nonmemproxy").checkboxradio("disable");
            $("#radio-proxy").checkboxradio("disable");
            break;
    }
}

function resetForm() {
    $("input.memberCheckIn[type=radio]").prop('checked', false).checkboxradio("refresh");
    $("#member-autocomplete-input").val("");
    $("#memgridContainer").hide();
    clearProxyInfo();
    $("body").pagecontainer("change", "#page1");
}

function preLogMemberIn() {
    if ($("#logmem_VOTE").text() == "No") {
        var alertText = "You need to make a selection!";

        var _vote = "", _p = "", _pt = "0";
        $("input.memberCheckIn[type=radio]").each(function () {
            if (this.checked === true && $(this).val() == 1) {
                _vote = this.value;
            }
            else if (this.checked === true && $(this).val() == 2) {
                if ($("#person").val() == "" && $("#nonperson").val() == "") {
                    alertText = "No proxy assigned to Member!";
                }
                else {
                    _vote = this.value;
                }
            }
            else if (this.checked === true && $(this).val() == 3) {
                _vote = this.value;
                _p = "-1";  //NON MEMBER VOTIING 
                _pt = "2";  //FOR NON-PERSON PROXY
            }
        });

        if (_vote != "") {
            var _data = {
                "MEMBERSEP": $("#logmem_MEMBERSEP").text(),
                "MAPNUMBER": $("#logmem_MAPNUMBER").text(),
                "NAME": $("#logmem_NAME").text(),
                "BILLADDR": $("#logmem_BILLADDR").text(),
                "MBRNO": $("#logmem_MEMBERNO").text(),
                "SERVADDR": $("#logmem_SERVADDR").text(),
                "TELEPHONE": $("#logmem_PHONE").text(),
                "METER": $("#logmem_METER").text(),
                "VOTE": _vote,
                "PROXY": _p,
                "PTYPE": _pt
            };
            logMemberIn(_data);
        }
        else {
            $("#spinCont").hide();
            if (navigator.notification != undefined) {
                navigator.notification.alert(alertText, fakeCallback, "Member Registration", "Ok");
            }
            else {
                alert(alertText);
            }
        }
    }
    else if ($("#logmem_VOTE").text() == "Yes") {
        if (navigator.notification != undefined) {
            navigator.notification.alert("Member already registered!", fakeCallback, "Member Registration", "Ok");
        }
        else {
            alert("Member already registered!");
        }
        $("#spinCont").hide();
    }

}

function logMemberIn(_data) {
    $.ajax({
        type: "POST",
        url: serviceURL + "memberCheckIn",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(_data),
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            if (result === "True") {
                if (navigator.notification != undefined) {
                    navigator.notification.alert("Succes - Member Checked In!", fakeCallback, "Member Registration", "Ok");
                    resetForm();
                }
                else {
                    alert("Succes - Member Checked In!");
                    resetForm();
                }
            }
            else {
                var issue = result;
                if (navigator.notification != undefined) {
                    navigator.notification.alert(result, fakeCallback, "Member Registration", "Ok");
                    resetForm();
                }
                else {
                    alert(result);
                    resetForm();
                }
            }
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });
}

function logProxyMemberIn(_data) {
    if ($("#logmem_MEMBERSEP").text().substring(0, ($("#logmem_MEMBERSEP").text().length - 3)) != _data.MBRNO) {
        $.ajax({
            type: "POST",
            url: serviceURL + "memberCheckIn",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(_data),
            cache: false,
            success: function (result) {
                if (result === "True") {
                    $("#radio-single").checkboxradio("disable");
                    $("#radio-nonmemproxy").checkboxradio("disable");
                    $("#radio-proxy").prop('checked', true).checkboxradio("refresh");

                    if (navigator.notification != undefined) {
                        $(".pbtn").css("visibility", "hidden");
                        $("#person").prop('readonly', true);
                        navigator.notification.alert("Member proxy registered!", fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        $(".pbtn").css("visibility", "hidden");
                        $("#person").prop('readonly', true);
                        alert("Member proxy registered!");
                    }
                }
                else {
                    if (navigator.notification != undefined) {
                        navigator.notification.alert("Member proxy was not registered! " + result, fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        alert("Member proxy was not registered! " + result);
                    }
                }
            },
            error: function (textStatus, errorThrown) {
                var txt = textStatus;
                var et = errorThrown;
            }
        });
    }
    else {
        if (navigator.notification != undefined) {
            navigator.notification.alert("Same MBRNO as member!", fakeCallback, "Member Registration", "Ok");
        }
        else {
            alert("Same MBRNO number as member!");
        }
    }
}

function logNonProxyMemberIn(_data) {
    if ($("#logmem_MEMBERSEP").text().substring(0, ($("#logmem_MEMBERSEP").text().length - 3)) != _data.MBRNO) {
        $.ajax({
            type: "POST",
            url: serviceURL + "memberCheckIn",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(_data),
            cache: false,
            success: function (result) {
                if (result === "True") {
                    $("#radio-single").checkboxradio("disable");
                    $("#radio-nonmemproxy").checkboxradio("disable");
                    $("#radio-proxy").prop('checked', true).checkboxradio("refresh");

                    if (navigator.notification != undefined) {
                        $(".npbtn").css("visibility", "hidden");
                        $("#nonperson").prop('readonly', true);
                        navigator.notification.alert("Non-Person proxy registered!", fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        $(".npbtn").css("visibility", "hidden");
                        $("#nonperson").prop('readonly', true);
                        alert("Non-Person proxy registered!");
                    }
                }
                else {
                    if (navigator.notification != undefined) {
                        navigator.notification.alert("Non-Person proxy was not registered! " + result, fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        alert("Non-Person proxy was not registered! " + result);
                    }
                }
            },
            error: function (textStatus, errorThrown) {
                var txt = textStatus;
                var et = errorThrown;
            }
        });
    }
    else {
        if (navigator.notification != undefined) {
            navigator.notification.alert("Same MBRNO number as member!", fakeCallback, "Member Registration", "Ok");
        }
        else {
            alert("Same MBRNO number as member!");
        }
    }
}

function getStats() {
    clearTableValues();

    $.ajax({
        type: "GET",
        url: serviceURL + "MEETINGSTATS",
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            if (permission >= 1) {
                buildDrawingView();
            }
            else if (permission == 0) {
                $("#drawingResults").remove();
            }

            $("#statsData").empty();
            var _c = result.MEETINGSTATSResult.COUNTY;
            var _d = result.MEETINGSTATSResult.DIST;
            var _T = 0;

            if (_d.length > 0) {
                //DISTRICTS
                for (d = 0; d < _d.length; d++) {
                    var dist = _d[d].CATAGORY;
                    switch (dist) {
                        case "1":
                            $("#b1").text(checkNull(_d[d].MIN));
                            $("#b2").text(checkNull(_d[d].NONMIN));
                            $("#b3").text(checkNull(_d[d].ATTEND));
                            $("#b4").text(checkNull(_d[d].NONATTEND));
                            $("#b5").text(checkNull(_d[d].TOTAL));
                            break;
                        case "2":
                            $("#e1").text(checkNull(_d[d].MIN));
                            $("#e2").text(checkNull(_d[d].NONMIN));
                            $("#e3").text(checkNull(_d[d].ATTEND));
                            $("#e4").text(checkNull(_d[d].NONATTEND));
                            $("#e5").text(checkNull(_d[d].TOTAL));
                            break;
                        case "3":
                            $("#r1").text(checkNull(_d[d].MIN));
                            $("#r2").text(checkNull(_d[d].NONMIN));
                            $("#r3").text(checkNull(_d[d].ATTEND));
                            $("#r4").text(checkNull(_d[d].NONATTEND));
                            $("#r5").text(checkNull(_d[d].TOTAL));                            
                            break;
                    }
                }
                T = parseInt(checkUndefined(_d[0])) + parseInt(checkUndefined(_d[1])) + parseInt(checkUndefined(_d[2]));
                $("#grandT").html("Grand Total: " + T);

                //Countys
                for (c = 0; c < _c.length; c++) {
                    var county = _c[c].CATAGORY;
                    switch (county) {
                        case "BLADEN":
                            $("#bl1").text(checkNull(_c[c].MIN));
                            $("#bl2").text(checkNull(_c[c].NONMIN));
                            $("#bl3").text(checkNull(_c[c].ATTEND));
                            $("#bl4").text(checkNull(_c[c].NONATTEND));
                            $("#bl5").text(checkNull(_c[c].TOTAL));
                            break;
                        case "COLUMBUS":
                            $("#c1").text(checkNull(_c[c].MIN));
                            $("#c2").text(checkNull(_c[c].NONMIN));
                            $("#c3").text(checkNull(_c[c].ATTEND));
                            $("#c4").text(checkNull(_c[c].NONATTEND));
                            $("#c5").text(checkNull(_c[c].TOTAL));
                            break;
                        case "DUPLIN":
                            $("#d1").text(checkNull(_c[c].MIN));
                            $("#d2").text(checkNull(_c[c].NONMIN));
                            $("#d3").text(checkNull(_c[c].ATTEND));
                            $("#d4").text(checkNull(_c[c].NONATTEND));
                            $("#d5").text(checkNull(_c[c].TOTAL));
                            break;
                        case "PENDER":
                            $("#p1").text(checkNull(_c[c].MIN));
                            $("#p2").text(checkNull(_c[c].NONMIN));
                            $("#p3").text(checkNull(_c[c].ATTEND));
                            $("#p4").text(checkNull(_c[c].NONATTEND));
                            $("#p5").text(checkNull(_c[c].TOTAL));
                            break;
                        case "SAMPSON":
                            $("#s1").text(checkNull(_c[c].MIN));
                            $("#s2").text(checkNull(_c[c].NONMIN));
                            $("#s3").text(checkNull(_c[c].ATTEND));
                            $("#s4").text(checkNull(_c[c].NONATTEND));
                            $("#s5").text(checkNull(_c[c].TOTAL));
                            break;
                        case "ONSLOW":
                            $("#o1").text(checkNull(_c[c].MIN));
                            $("#o2").text(checkNull(_c[c].NONMIN));
                            $("#o3").text(checkNull(_c[c].ATTEND));
                            $("#o4").text(checkNull(_c[c].NONATTEND));
                            $("#o5").text(checkNull(_c[c].TOTAL));
                            break;
                    }
                }

                $("#district  table tr td").eq(0).css('width', '200px');
                $("#county  table tr td").eq(0).css('width', '200px');
            }
            else if (_d.length == 0) {
                $("#grandT").html("Grand Total: 0");
            }

        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });
}

function buildDrawingView() {
    $("#drawingResults").empty();
    $.ajax({
        type: "GET",
        url: serviceURL + "WINNERS",
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var re = result.WINNERSResult;
            if (re.length > 0) {
                $("#drawingResults").append("<div><b>Prize winners</b></div><div id='winners' style='text-align: left; padding-left: 20px;'></div>");
                for (i = 0; i < re.length; i++) {
                    $("#winners").append("<div>" + re[i] + "</div>");
                }
            }
            else {
                $("#drawingResults").append("<div>Prize winners have not been selected!</div>");

                //if (permission >= 1) {
                $("#drawingResults").append("<div><button onclick='pickWinners();' style='background-color: black;' class='ui-btn ui-btn-b ui-btn-inline ui-mini ui-corner-all'>Draw Winners</button></div>");
                //}
            }
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });
}

function pickWinners() {
    if (navigator.notification != undefined) {
        navigator.notification.confirm("Are you sure you want to select prize winners?", pickWinnersBTN, "Please Confirm:", "No, Yes");
    }
    else {
        getWinners();
    }
}

function pickWinnersBTN(button) {
    if (button == 2) {
        getWinners();
    }
    else if (button == 1) {

    }
}

function getWinners() {
    $.ajax({
        type: "GET",
        url: serviceURL + "GET_RANDOM",
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            buildDrawingView();
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });

}

function checkUndefined(v) {
    var _v = 0;
    if (v != undefined) {
        _v = v.TOTAL;
    }
    return _v;
}

function clearTableValues() {
    $('#b1').text('0');
    $('#b2').text('0');
    $('#b3').text('0');
    $('#b4').text('0');
    $('#b5').text('0');
    $('#e1').text('0');
    $('#e2').text('0');
    $('#e3').text('0');
    $('#e4').text('0');
    $('#e5').text('0');
    $('#r1').text('0');
    $('#r2').text('0');
    $('#r3').text('0');
    $('#r4').text('0');
    $('#r5').text('0');
    $('#bl1').text('0');
    $('#bl2').text('0');
    $('#bl3').text('0');
    $('#bl4').text('0');
    $('#bl5').text('0');
    $('#c1').text('0');
    $('#c2').text('0');
    $('#c3').text('0');
    $('#c4').text('0');
    $('#c5').text('0');
    $('#d1').text('0');
    $('#d2').text('0');
    $('#d3').text('0');
    $('#d4').text('0');
    $('#d5').text('0');
    $('#o1').text('0');
    $('#o2').text('0');
    $('#o3').text('0');
    $('#o4').text('0');
    $('#o5').text('0');
    $('#p1').text('0');
    $('#p2').text('0');
    $('#p3').text('0');
    $('#p4').text('0');
    $('#p5').text('0');
    $('#s1').text('0');
    $('#s2').text('0');
    $('#s3').text('0');
    $('#s4').text('0');
    $('#s5').text('0');

}

function checkNull(val) {
    var a = 0;
    if (val != null) {
        a = val;
    }
    return a;
}

function clearProxyInfo() {
    $("#proxyFields").css("visibility", "hidden").css("height", "0");
    $("#person").val("");
    $("#nonperson").val("");

    $("#radio-single").checkboxradio("enable");
    $("#radio-nonmemproxy").checkboxradio("enable");
    $("#radio-proxy").checkboxradio("enable").prop('checked', false);

}

function checkForProxy(MEMBERSEP) {
    $.ajax({
        type: "GET",
        url: serviceURL + "MEMBERLIST/PROXY|" + $("#logmem_MEMBERSEP").text(),
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var results = result.MEMBERLISTResult;
            if (results.length > 0) {
                $("#proxyFields").css("visibility", "visible").css("height", "187px");
                $("#person").val("");
                $("#nonperson").val("");

                $(".pbtn").css("visibility", "");
                $(".npbtn").css("visibility", "");

                $("#person").prop('readonly', false);
                $("#nonperson").prop('readonly', false);

                $("#radio-single").checkboxradio("disable");
                $("#radio-nonmemproxy").checkboxradio("disable");
                $("#radio-proxy").prop('checked', true).checkboxradio("refresh");

                for (var i = 0; i < results.length; i++) {
                    if (results[i].PTYPE == "1") {
                        $("#person").val(results[i].MEMBERSEP);
                        $(".pbtn").css("visibility", "hidden");
                        $("#person").prop('readonly', true);

                    }
                    else if (results[i].PTYPE == "2") {
                        $("#nonperson").val(results[i].MEMBERSEP);
                        $(".npbtn").css("visibility", "hidden");
                        $("#nonperson").prop('readonly', true);
                    }
                }
            }
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });
}

function showProxyView() {
    if ($("#proxyFields").css("visibility") != "visible") {
        if ($("#logmem_PROXY").text().length == 0) {
            $("#proxyFields").css("visibility", "visible").css("height", "187px");
            $("#person").val("");
            $("#nonperson").val("");

            $(".pbtn").css("visibility", "");
            $(".npbtn").css("visibility", "");

            $("#person").prop('readonly', false);
            $("#nonperson").prop('readonly', false);
        }
        else {
            if (navigator.notification != undefined) {
                navigator.notification.alert("Member already registered as proxy!", fakeCallback, "Member Registration", "Ok");
            }
            else {
                alert("Member already registered as proxy!");
            }
        }
    }
}

function scanPerson() {
    try {
        $("#scanText").text("");
        localStorage.setItem("fcemcInventory_scanning", true);
        cordova.plugins.barcodeScanner.scan(
          function (result) {
              if (result.cancelled != 1) {
                  $("#person").val(result.text.trim(result.text));
                  searchPerson();
              }
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          function (error) {
              $("#scanText").text("Scanning Person failed: " + error);
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          {
              "preferFrontCamera": false, // iOS and Android
              "showFlipCameraButton": true, // iOS and Android
              "prompt": "Place a barcode inside the scan area", // supported on Android only
              //"formats": "QR_CODE,PDF_417", // default: all but PDF_417 and RSS_EXPANDED
              "orientation": "portrait" // Android only (portrait|landscape), default unset so it rotates with the device
          }
       );
    }
    catch (err) {
        alert(err.message.toString());
    }
}

function searchPerson() {
    if ($("#person").val() != "") {
        $.ajax({
            type: "GET",
            url: serviceURL + "MEMBERLISTSCAN/" + $("#person").val(),
            contentType: "application/json; charset=utf-8",
            cache: false,
            beforeSend: function () {
                $("#spinCont").show();
            },
            success: function (result) {
                var results = result.MEMBERLISTSCANResult;
                if (results.length == 1 && results[0].VOTE === null) {
                    var _data = {
                        "MEMBERSEP": results[0].MEMBERSEP,
                        "MAPNUMBER": results[0].MAPNUMBER,
                        "NAME": results[0].NAME,
                        "BILLADDR": results[0].BILLADDR,
                        "MBRNO": results[0].MEMBERNO,
                        "SERVADDR": results[0].SERVADDR,
                        "TELEPHONE": results[0].PHONE,
                        "METER": results[0].METER,
                        "VOTE": "3",
                        "PROXY": $("#logmem_MEMBERSEP").text(),
                        "PTYPE": "1"
                    };
                    logProxyMemberIn(_data);
                }
                else if (results.length == 1 && results[0].VOTE != null) {
                    if (navigator.notification != undefined) {
                        navigator.notification.alert("Member already registered!", fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        alert("Member already registered!");
                    }
                }
                else if (results.length === 0) {
                    if (navigator.notification != undefined) {
                        navigator.notification.alert("No member found!", fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        alert("No member found!");
                    }
                }
            },
            complete: function () {
                $("#spinCont").hide();
            },
            error: function (textStatus, errorThrown) {
                var txt = textStatus;
                var et = errorThrown;
            }
        });
    }
}

function scanNonPerson() {
    try {
        $("#scanText").text("");
        localStorage.setItem("fcemcInventory_scanning", true);
        cordova.plugins.barcodeScanner.scan(
          function (result) {
              if (result.cancelled != 1) {
                  $("#nonperson").val(result.text.trim(result.text));
                  searchNonPerson();
              }
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          function (error) {
              $("#scanText").text("Scanning Non-Person failed: " + error);
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          {
              "preferFrontCamera": false, // iOS and Android
              "showFlipCameraButton": true, // iOS and Android
              "prompt": "Place a barcode inside the scan area", // supported on Android only
              //"formats": "QR_CODE,PDF_417", // default: all but PDF_417 and RSS_EXPANDED
              "orientation": "portrait" // Android only (portrait|landscape), default unset so it rotates with the device
          }
       );
    }
    catch (err) {
        alert(err.message.toString());
    }
}

function searchNonPerson() {
    if ($("#nonperson").val() != "") {
        $.ajax({
            type: "GET",
            url: serviceURL + "MEMBERLISTSCAN/" + $("#nonperson").val(),
            contentType: "application/json; charset=utf-8",
            cache: false,
            beforeSend: function () {
                $("#spinCont").show();
            },
            success: function (result) {
                var results = result.MEMBERLISTSCANResult;
                if (results.length == 1 && results[0].VOTE === null) {
                    var _data = {
                        "MEMBERSEP": results[0].MEMBERSEP,
                        "MAPNUMBER": results[0].MAPNUMBER,
                        "NAME": results[0].NAME,
                        "BILLADDR": results[0].BILLADDR,
                        "MBRNO": results[0].MEMBERNO,
                        "SERVADDR": results[0].SERVADDR,
                        "TELEPHONE": results[0].PHONE,
                        "METER": results[0].METER,
                        "VOTE": "3",
                        "PROXY": $("#logmem_MEMBERSEP").text(),
                        "PTYPE": "2"
                    };
                    logNonProxyMemberIn(_data);
                }
                else if (results.length == 1 && results[0].VOTE != null) {
                    if (navigator.notification != undefined) {
                        navigator.notification.alert("Non-Member already registered!", fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        alert("Non-Member already registered!");
                    }
                }
                else if (results.length === 0) {
                    if (navigator.notification != undefined) {
                        navigator.notification.alert("No member found!", fakeCallback, "Member Registration", "Ok");
                    }
                    else {
                        alert("No non-member found!");
                    }
                }
            },
            complete: function () {
                $("#spinCont").hide();
            },
            error: function (textStatus, errorThrown) {
                var txt = textStatus;
                var et = errorThrown;
            }
        });
    }
}

function unregisterMemeber() {
    $.ajax({
        type: "GET",
        url: serviceURL + "UNREGISTER/" + $("#logmem_MEMBERNO").text() + "|" + $("#logmem_MEMBERSEP").text(),
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var r = result;
            if (navigator.notification != undefined) {
                navigator.notification.alert("Member has been unregistered!", fakeCallback, "Member Registration", "Ok");
                resetForm();
            }
            else {
                alert("Member has been unregistered!");
                resetForm();
            }
        },
        complete: function () {
            $("#spinCont").hide();
        },
        error: function (textStatus, errorThrown) {
            var txt = textStatus;
            var et = errorThrown;
        }
    });
}

function checkNull(val) {
    var _val = ""
    if (val != null) {
        _val = val.toString();
    }
    return _val;
}

//endregion