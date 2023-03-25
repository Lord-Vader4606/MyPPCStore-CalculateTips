// ==UserScript==
// @name         Tips Calculator
// @namespace    https://tampermonkey.net/
// @version      0.3
// @description  A simple script to calculate tips from ToastPOS
// @author       Erik Christensen
// @match        https://myppcstore.com/*
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// @require      https://gist.githubusercontent.com/jonmaim/7b896cf5c8cfe932a3dd/raw/a8ac087468a508f4b6da1a94f1659e42f7bd3a6a/csv2js.js
// @grant        none
// ==/UserScript==

$(".treeview")
  .eq(0)
  .html('<a href="FrontOfHouse_GiftCard.php">Tip Calculator</a>');

if (
  document.location.href == "https://myppcstore.com/FrontOfHouse_GiftCard.php"
) {
  $(".content-header").remove();
  $(".content").html(
    '<section class="content"><div class="row"><div class="col-md-6"><div class="box box-primary"><div class="box-header"><h3 class="box-title">Tip Calculator v0.3</h3></div><div class="box-body"><ol><li>Navigate to the Toast labor summary page for the day you want to do tips</li><li>Enter the amount under "tips" here on the "tips" field</li><li>Download the "payroll export" from Toast</li><li>Upload the "payroll export" here</li><li>Press the button</li></ol><div class=" "><table border="1" width="100%" class="table-hover" style="border-collapse: collapse;" cellpadding="8"><tbody><tr valign="top"><td class="myPPC_label">Toast Payroll Export:</td><td class="myppc_LrgLeft"><input type="file" id="toastFile" name="toast" accept=".csv"></td></tr><tr><td class="myPPC_label">Total Tips:</td><td class="myppc_LrgLeft"><input type="number" class="form-control myppcInputLabel" name="tips" placeholder="Tips" id="tips"></td></tr></tbody></table></div></div></div></div></div><div class="row"><div class="box-footer clearfix"><table width="100%"><tbody><tr><td width="50%"><button class="btn btn-warning" type="button" id="toastImportButton">Calculate tips from ToastPOS</button></td></tr></tbody></table></div></div></section>'
  );
  $("#toastImportButton").click(async function () {
    if (document.getElementById("toastFile").value != "") {
      if (document.getElementById("toastFile").files[0].type == "text/csv") {
        const reader = new FileReader();
        var content =
          '<section class="content"><div class="row"><div class="col-md-6">';
        const tips = document.getElementById("tips").value;
        reader.onload = function (e) {
          const dat = csvTojs(reader.result);
          var curr;
          var totalHours = 0;
          var left = tips;

          dat.forEach(function (item, index, array) {
            curr = array[index];
            totalHours = totalHours + parseFloat(curr["Regular Hours"]);
          });

          var tipsPerHour = Math.floor(tips / totalHours);
          var totalTips = 0;
          var employeeTips = {};
          dat.forEach(function (item, index, array) {
            curr = array[index];
            var employeeHours = parseFloat(curr["Regular Hours"]);
            var employeeEarnedTips = Math.floor(employeeHours * tipsPerHour);
            totalTips += employeeEarnedTips;
            employeeTips[curr.Employee] = employeeEarnedTips;
          });

          var difference = tips - totalTips;
          if (difference >= 1) {
            // Subtract $1 from the employee who would have received the most tips
            var maxEmployee = null;
            var maxEarnedTips = -1;
            for (var employee in employeeTips) {
              if (employeeTips.hasOwnProperty(employee)) {
                var earnedTips = employeeTips[employee];
                if (earnedTips > maxEarnedTips) {
                  maxEarnedTips = earnedTips;
                  maxEmployee = employee;
                }
              }
            }
            employeeTips[maxEmployee] -= 1;
            difference -= 1;
          }

          // Distribute the remaining tips
          var employees = Object.keys(employeeTips);
          var numEmployees = employees.length;
          var additionalTipsPerEmployee = Math.floor(difference / numEmployees);
          for (var i = 0; i < numEmployees; i++) {
            employee = employees[i];
            earnedTips = employeeTips[employee];
            var additionalTips =
              i < difference % numEmployees
                ? additionalTipsPerEmployee + 1
                : additionalTipsPerEmployee;
            earnedTips += additionalTips;
            content +=
              '<div class="box box-primary"><div class="box-header"><h3 class="box-title">' +
              employee +
              '</h3></div><div class="box-body"><ul><li>Hours Worked: ' +
              dat.find((item) => item.Employee === employee)["Regular Hours"] +
              "</li><li>Tips Earned: $" +
              earnedTips +
              "</li></div></div>";
          }

          $(".content").html(content);
        };
        await reader.readAsText(document.getElementById("toastFile").files[0]);
      } else {
        alert(
          "Error - You must upload a file that is a payroll export from Toast"
        );
      }
    } else {
      alert("Error - You must upload a file!");
    }
  });
}
