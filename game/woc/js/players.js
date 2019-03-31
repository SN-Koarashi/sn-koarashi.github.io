$(document).ready(function() {
    $("#region option").each(function() {
        var b = parseInt($(this).val().split(":")[1])
          , d = $(this).val().split(":")[0]
          , c = $(this);

        $.get("https://" + d + ":" + b, function(a, b) {
            a = JSON.parse(a);
            c.text(c.text() + " [" + a.current_players + "/" + a.max_players + "]")
        })
    })
	
});
$(document).ready(function() {
    var a = document.getElementById("region");
    var b = Math.floor(Math.random() * (a.options.length - 1));
    a.options[b].selected = true;
    a.onchange()
});
