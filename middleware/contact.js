var jsdom = require("jsdom");
var JSDOM = jsdom.JSDOM;

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>title</title>
    </head>
    <body>
		<div>
			<h2>
				<span>*</span>お問い合わせ内容に該当する項目をお選び下さい
			</h2>

			<label for="option1">
				<input type="radio" name="option" id="option1" checked="checked" required>
					Webサイト・Webアプリケーション
			</label><br>
			<label for="option2">
				<input type="radio" name="option" id="option2">
					翻訳
			</label><br>
			<label for="option3">
				<input type="radio" name="option" id="option3">
					Webサイト・Webアプリケーションと翻訳の両方
			</label>
		</div>
    </body>
</html>
`);

const { document } = dom.window;

// ラジオボタンのDOM
var elements = document.getElementsByName("option");
var answer = "";
// 選択状態の値(value)を取得
for(var i = 0; i < elements.length; i++){
	if(elements[i].checked){
		var answer = elements[i].value;
	}
}

module.exports = answer;
