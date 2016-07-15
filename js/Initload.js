var tryingToReconnect = false, user, scanResult = 0;

$(document).ready(function () {
    //adjust for status bar in iOS
    if (/iPad|iPod|iPhone/i.test(navigator.userAgent)) {
        $("body").css("background-color", "black");
        $("div[role='dialog']").css("background-color", "#efecec");
        $(".pg").css({ "margin-top": "20px" });
    }

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
           { visible: false },
           { visible: false },
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true }
        ],
        cellClicked: function (e, args) {
            if (args.cell._wijgrid != null) {
                $("#memberData").empty();
                var memData = [];
                for (var m = 0; m < $("#memgrid").wijgrid("columns").length; m++) {
                    args.cell._ci = m;
                    var title = args.cell.column().headerText;
                    var value = args.cell.value();
                    memData.push(title + "|" + value);
                }
                changePage('checkInPage');
                beginCheckIn(memData);
            }
        }
    });

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

    $("#cancelCheckin").on("click", function () {
        resetForm();
    });

    $("#popuppopupCheckinError").popup({ history: false });

    $("#popupCheckinSuccess").on("popupafterclose", function (event, ui) {
        resetForm();
    });

    $("a").on("click", function () {
        if ($(this).context.innerText === "Back to Main Page") {
            resetForm();
        }
    });

    $("#saveCheckin").on("click", function () {
        logMemberIn();
    });
});

//region Login&Cookies
function checkLogin() {
    user = $("#un").val().trim();
    var _pw = $("#pw").val().trim();
    var paramItems = user + "|" + _pw;
    $.ajax({
        type: "GET",
        url: "http://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/authenticateYouSir/" + paramItems,
        contentType: "application/json; charset=utf-8",
        cache: false,
        success: function (results) {
            if (results.authenticateYouSirResult) {
                $("#loginError").text("");

                $.mobile.pageContainer.pagecontainer("change", "#page1");
                if (localStorage.fcemcInventory_uname == undefined || localStorage.fcemcInventory_uname == "") {
                    setCookie(user, _pw, 1); //expires 1 day from inital login
                }
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
//endregion

//region lookup region
function scan() {
    try {
        localStorage.setItem("fcemcInventory_scanning", true);
        cordova.plugins.barcodeScanner.scan(
          function (result) {
              if (result.cancelled != 1) {
                  getMemberScanInfo(result.text);
              }
              localStorage.setItem("fcemcInventory_scanning", false);
          },
          function (error) {
              $("#scanText").text("Scanning failed: " + error);
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

//function getScanMember(mbrsep) {
//    var paramItems = "MBRSEP|" + mbrsep;
//    $.ajax({
//        type: "GET",
//        url: "http://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/MEMBERLIST/" + paramItems,
//        contentType: "application/json; charset=utf-8",
//        cache: false,
//        beforeSend: function () {
//            //$("#scanText").text("");
//            $("#spinCont").show();
//        },
//        success: function (result) {

//            var results = result.MEMBERLISTResult;
//            var string = "";

//            if (results.length > 0) {
//                string = "NAME: " + results[0].NAME + "\n" +
//                    "MEMBERNO: " + results[0].MEMBERNO + "\n" +
//                    "MEMBERSEP: " + results[0].MEMBERSEP + "\n" +
//                    "BILLADDR: " + results[0].BILLADDR + "\n" +
//                    "SERVADDR: " + results[0].SERVADDR + "\n" +
//                    "PHONE: " + results[0].PHONE + "\n" +
//                     "MAPNUMBER: " + results[0].MAPNUMBER;
//            }
//            else {
//                string = mbrsep;
//            }
//            $("#scanText").text(string);
//            $("#spinCont").hide();
//        },
//        complete: function () {
//            $("#spinCont").hide();
//        },
//        error: function (textStatus, errorThrown) {
//            var txt = textStatus;
//            var et = errorThrown;
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

function fakeCallback() { }
//endregion

//manual lookup region
function changePage(page) {
    $.mobile.pageContainer.pagecontainer("change", "#" + page, {
        transition: 'flip',
        changeHash: false,
        reverse: true,
        showLoadMsg: true
    });
}

function getMember(scanResult) {
    //if (scanResult.length != undefined) {
    //    getMemberInfo("MBRSEP|" + scanResult);
    //    changePage('memSearchPage');
    //}
    //else {
    if ($("#member-autocomplete-input").val().length >= 3) {
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
    //}
}

function getMemberScanInfo(paramItems) {
    $.ajax({
        type: "GET",
        url: "HTTP://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/MEMBERLISTSCAN/" + paramItems,
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var results = result.MEMBERLISTSCANResult;
            if (results.length == 1) {
                var string = "";
                string += "<div><b>NAME: </b><label style='display:inline-block' id='logmem_NAME>" + results[0].NAME.toString() + "</label></div>";
                string += "<div><b>PHONE: </b><label style='display:inline-block' id='logmem_PHONE>" + results[0].PHONE.toString() + "</label></div>";
                string += "<div><b>MEMBERNO: </b><label style='display:inline-block' id='logmem_MEMBERNO>" + results[0].MEMBERNO.toString() + "</label></div>";
                string += "<div><b>MEMBERSEP: </b><label style='display:inline-block' id='logmem_MEMBERSEP>" + results[0].MEMBERSEP.toString() + "</label></div>";
                string += "<div><b>BILLADDR: </b><label style='display:inline-block' id='logmem_BILLADDR>" + results[0].BILLADDR.toString() + "</label></div>";
                string += "<div><b>SERVADDR: </b><label style='display:inline-block' id='logmem_SERVADDR>" + results[0].SERVADDR.toString() + "</label></div>";
                string += "<div><b>MAPNUMBER: </b><label style='display:inline-block' id='logmem_MAPNUMBER>" + results[0].MAPNUMBER.toString() + "</label></div>";
                string += "<div><b>METER: </b><label style='display:inline-block' id='logmem_METER>" + results[0].METER.toString() + "</label></div>";

                $("#memberData").empty();
                $("#memberData").append(string);
                changePage('checkInPage');
            }
            else if (results.length > 1) {
                //just in case there are duplicate MBRSEP numbers        
                var memData = [];
                for (var i = 0; i < results.length; i++) {
                    memData.push({ MAPNUMBER: results[i].MAPNUMBER, METER: results[i].METER, NAME: results[i].NAME, MEMBERNO: results[i].MEMBERNO, MEMBERSEP: results[i].MEMBERSEP, BILLADDR: results[i].BILLADDR, SERVADDR: results[i].SERVADDR, PHONE: results[i].PHONE })
                }
                $("#memgridContainer").show();
                $("#memgrid").wijgrid("option", "data", memData);
                $(".wijmo-wijgrid-headerrow th div").css("background-color", "#0D914F");
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

function getMemberInfo(paramItems) {
    $.ajax({
        type: "GET",
        url: "http://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/MEMBERLIST/" + paramItems,
        contentType: "application/json; charset=utf-8",
        cache: false,
        beforeSend: function () {
            $("#spinCont").show();
        },
        success: function (result) {
            var results = result.MEMBERLISTResult;
            var data = [];
            for (var i = 0; i < results.length; i++) {
                data.push({ MAPNUMBER: results[i].MAPNUMBER, METER: results[i].METER, NAME: results[i].NAME, MEMBERNO: results[i].MEMBERNO, MEMBERSEP: results[i].MEMBERSEP, BILLADDR: results[i].BILLADDR, SERVADDR: results[i].SERVADDR, PHONE: results[i].PHONE })
            }
            $("#memgridContainer").show();
            $("#memgrid").wijgrid("option", "data", data);
            $(".wijmo-wijgrid-headerrow th div").css("background-color", "#0D914F");
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
        $("#memberData").append("<div><b>" + memData[i].toString().split("|")[0] + "</b>: <label  style='display:inline-block' id='logmem_" + memData[i].toString().split("|")[0] + "'>" + memData[i].toString().split("|")[1] + "</label></div>");
    }
}
function resetForm() {
    $("input.memberCheckIn[type=radio]").prop('checked', false).checkboxradio("refresh");
    $("#member-autocomplete-input").val("");
    $("#memgridContainer").hide();
    $("body").pagecontainer("change", "#page1");
}
function logMemberIn() {
    var _vote = "";
    $("input.memberCheckIn[type=radio]").each(function () {
        if (this.checked === true)
            _vote = this.value;
    });

    var _data = {
        "MEMBERSEP": $("#logmem_MEMBERSEP").text(),
        "MAPNUMBER": $("#logmem_MAPNUMBER").text(),
        "NAME": $("#logmem_NAME").text(),
        "BILLADDR": $("#logmem_BILLADDR").text(),
        "MBRNO": $("#logmem_MEMBERNO").text(),
        "SERVADDR": $("#logmem_SERVADDR").text(),
        "TELEPHONE": $("#logmem_PHONE").text(),
        "METER": $("#logmem_METER").text(),
        "VOTE": _vote
    };

    if (_vote != "") {
        $.ajax({
            type: "POST",
            url: "http://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/memberCheckIn",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(_data),
            cache: false,
            success: function (result) {
                if (result === "True") {
                    $("#popupCheckinSuccess").popup("open");
                }
                else {
                    var issue = result;
                    $("#popuppopupCheckinError p").text(result);
                    $("#popuppopupCheckinError").popup("open");
                }
            },
            error: function (textStatus, errorThrown) {
                var txt = textStatus;
                var et = errorThrown;
            }
        });
    }
    else if (_vote === "") {
        $("#popuppopupCheckinError p").text("You need to make a selection!");
        $("#popuppopupCheckinError").popup("open");
    }
}

//endregion