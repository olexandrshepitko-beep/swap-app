content = open("/data/data/com.termux/files/home/barter-app/frontend/src/i18n/translations.ts", "r").read()

new_keys = '''
  "create.electronics": "Electronics",
  "create.clothing": "Clothing",
  "create.books": "Books",
  "create.home": "Home & Garden",
  "create.sports": "Sports",
  "create.toys": "Toys",
  "create.other": "Other",
  "create.new": "New",
  "create.likeNew": "Like new",
  "create.good": "Good",
  "create.fair": "Fair",
'''

pos_after = content.find('"match.', content.find('"create.step"'))
new_content = content[:pos_after] + new_keys + content[pos_after:]

open("/data/data/com.termux/files/home/barter-app/frontend/src/i18n/translations.ts", "w").write(new_content)
print(f"OK: {len(new_content)} bytes written")
