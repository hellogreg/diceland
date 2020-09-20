# diceland

Diceland is a bare bones strategy game that I wrote several years ago, just to learn how to use the <canvas> element.

Play it here: [hellogreg.github.io/diceland](http://hellogreg.github.io/diceland)

Click one of your territories to be an attacker, and then select an adjacent enemy to attack. It's a little like Risk. Your attacking territory rolls one six-sided die, as does the defender. Diceland's twist is that your adjacent allies give you a bonus when attacking and defending. Each ally adds one point to your die roll. If the attacker's adjusted roll is higher than the defender's, then the attacker claims the territory.

I wrote this in JavaScript (with help from Typekit and jQuery). All of the artwork is created using JavaScript's canvas object. That means no image files and no Flash. The game works in most modern browsers (Firefox, Safari, Chrome, Opera, IE9) and on iOS devices (minus a few features).
