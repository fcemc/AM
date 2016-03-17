var spinner;
$(document).ready(function () {
    getSpinner();
    //spinner.stop();
    $("#spinCont").hide();

    $("#memgridContainer").hide();
    $("#memgrid").wijgrid({
        allowSorting: false,
        scrollMode: "auto",
        columns: [
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
           { textAlignment: "center", ensureColumnsPxWidth: false, ensurePxWidth: true },
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

                $("body").pagecontainer("change", "#checkInPage", {
                    transition: 'flip',
                    changeHash: false,
                    reverse: true,
                    showLoadMsg: true
                });

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
            $("#member-autocomplete-input").attr('type', 'number');
        }
        else {
            $("#member-autocomplete-input").attr('type', '');
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

    $("a").on("click",function () {
        if ($(this).context.innerText === "Back to Main Page")
        {
            resetForm();
        }
    });

    $("#saveCheckin").on("click", function () {
        logMemberIn();
    });
});

function getMember() {
    if ($("#member-autocomplete-input").val().length >= 3) {
        var v = $("#member-autocomplete-input").val();
        var f;
        $("input.memberSearch[type=radio]").each(function () {
            if (this.checked === true) {
                f = this.value;
            }
        });
        
        var paramItems = f + "|" + v;
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
                    data.push({ NAME: results[i].NAME, MEMBERNO: results[i].MEMBERNO, MEMBERSEP: results[i].MEMBERSEP, BILLADDR: results[i].BILLADDR, SERVADDR: results[i].SERVADDR, PHONE: results[i].PHONE, MAPNUMBER: results[i].MAPNUMBER })
                }
                $("#memgridContainer").show();
                $("#memgrid").wijgrid("option", "data", data);
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
    else if ($("#member-autocomplete-input").val().length === 0) {
        $("#spinCont").hide();
        $("#memgridContainer").hide();
    }
}
function beginCheckIn(memData) {
    for (var i = 0; i < memData.length; i++) {
        $("#memberData").append("<div><b>" + memData[i].toString().split("|")[0] + "</b>: <label  style='display:inline-block' id='logmem_" + memData[i].toString().split("|")[0] + "'>" + memData[i].toString().split("|")[1] + "</label></div>")        
    }
}
function resetForm()
{
    $("input.memberCheckIn[type=radio]").prop('checked', false).checkboxradio("refresh");
    $("#member-autocomplete-input").val("");
    $("#memgridContainer").hide();
    $("body").pagecontainer("change", "#mainPage");
}

function logMemberIn()
{
    var act = "", msep = "";
    $("input.memberCheckIn[type=radio]").each(function () {
        if (this.checked === true)
            act = this.value;
    });
    msep = $("#logmem_MEMBERNO").text();

    var _data = { "MEMBERSEP": msep, "ACTION": act };

    if (act != "") {
        $.ajax({
            type: "POST",            
            url: "http://gis.fourcty.org/FCEMCrest/FCEMCDataService.svc/memberCheckIn",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(_data),
            cache: false,
            success: function (result) {
                if (result === "True")
                    $("#popupCheckinSuccess").popup("open");

            },
            error: function (textStatus, errorThrown) {
                var txt = textStatus;
                var et = errorThrown;
            }
        });
    }
    else if(act === "")
    {
        //$("#popupCheckinSuccess").popup("close");
        $("#popuppopupCheckinError").popup("open");     
    }
}

function getSpinner()
{
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