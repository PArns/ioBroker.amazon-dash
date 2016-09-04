// converts a numeric array: [ 143, 63, 32, 51, 84, 68 ]
// to a string: "8f:3f:20:33:54:44"=
// for comparison
exports.int_array_to_hex = function (int_array) {
    var hex = "";
    for (var i in int_array){
        var h = int_array[i].toString(16); // converting to hex
        if (h.length < 2) {h = '0' + h}; //adding a 0 for non 2 digit numbers
        if (i !== int_array.length) {hex+=":"}; //adding a : for all but the last group
        hex += h;
    }
    return hex.slice(1);//slice is to get rid of the leading :
};