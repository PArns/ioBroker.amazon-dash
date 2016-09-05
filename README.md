![Logo](admin/amazon-dash.png)
# ioBroker.amazon-dash
=================

Adapter to add Amazon Dash Buttons to ioBroker

##Steps 
1. Install libpcap-dev

    ```apt-get install libpcap-dev```

2. Pair your Dash-Adapter within the Amazon App but don't select a product! 
    Just quit the installation procedure at the product selection tab.
    Otherwise you'll order every time a product ;)
  
3. Hit the dash button (should be white first, then flashing red)

4. Within the adapter objects, a new dash button should appear which you can use to start scenes or within the JS adapter

## Changelog

### 0.0.2
(PArns) Added switch state, which toggles between true and false
(PArns) Changed License

### 0.0.1
(PArns) Initial release 

## License
The MIT License (MIT)

Copyright (c) 2016 Patrick Arns <npm@patrick-arns.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
