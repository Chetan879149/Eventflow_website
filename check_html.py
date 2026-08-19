from html.parser import HTMLParser
from pathlib import Path

class TagChecker(HTMLParser):
    void_tags = {'br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr'}
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag in self.void_tags:
            return
        self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if not self.stack:
            self.errors.append(f'Unexpected </{tag}> at {self.getpos()}')
            return
        last, pos = self.stack.pop()
        if last != tag:
            self.errors.append(f'Tag mismatch: opened <{last}> at {pos} but closed </{tag}> at {self.getpos()}')

    def close(self):
        super().close()
        while self.stack:
            tag, pos = self.stack.pop()
            self.errors.append(f'Unclosed <{tag}> opened at {pos}')

text = Path('index.html').read_text(encoding='utf-8')
parser = TagChecker()
parser.feed(text)
parser.close()
print('errors:', len(parser.errors))
for e in parser.errors[:100]:
    print(e)
