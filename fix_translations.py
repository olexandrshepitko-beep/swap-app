#!/usr/bin/env python3
"""Add missing translation keys to all language sections."""
import re

PATH = "/data/data/com.termux/files/home/barter-app/frontend/src/i18n/translations.ts"

with open(PATH, 'r') as f:
    content = f.read()

# ====== NEW KEYS TO ADD ======
# Format: (section_start_marker, new_lines_insert_before_marker)
# We insert before the first key of each section

new_en = '''  "feed.showAll": "Show all",
  "feed.itsAMatch": "Its a match!",
  "feed.matchDesc": "also wants to exchange!",
  "feed.continueBrowsing": "Continue browsing",
  "feed.emptyHint": "No more items. Check back later for new listings.",
  "feed.viewMatches": "View matches",
  "start.uploadYourItem": "Upload your item",
  "create.hint": "5-15 sec, show from all sides",
  "create.uploadVideo": "Upload item video",
  "create.recordVideo": "Record video",
  "create.fromGallery": "from gallery",
  "create.uploadFromGallery": "Upload from gallery",
  "create.descriptionPlaceholder": "Condition, accessories, defects...",
  "create.step": "Step",
  "match.statusCompleted": "Contact open",
  "match.statusPending": "Awaiting payment",
  "match.statusPaidYou": "You paid",
  "match.statusPaidOther": "Other side paid",
  "match.statusExpired": "Expired",
  "match.conditionNew": "New",
  "match.conditionLikeNew": "Like new",
  "match.conditionGood": "Good",
  "match.conditionFair": "Fair",
  "liked.itemsCount": "items",
  "liked.chosenBy": "chosen by",
  "liked.selectedForTrade": "Selected for exchange",
  "liked.iWantToTrade": "I want to trade",
  "liked.remove": "Remove",
  "liked.backToFeed": "Watch feed",
  "liked.tradingDesc": "These people want to trade with you! Each has chosen what they would give for your item.",
  "liked.noOnePickedDesc": "No one picked you yet. Upload your item so others can choose you.",
  "liked.emptyDesc": "Swipe right on items you like and they will appear here",
  "payment.cost": "Opening cost:",
  "payment.chatHint": "Press the button below to open chat",
  "payment.ownerUsername": "@owner_username",
  "pro.subscription": "PRO subscription",
  "pro.subscribePrice": "Become PRO $10/mo",
  "common.noCategory": "No items in this category yet",
  "common.cameraError": "Could not access camera. Please allow access.",
  "common.videoTooBig": "Video too large. Please upload video up to 50MB.",
'''

new_ru = '''  "feed.showAll": "Показать все",
  "feed.itsAMatch": "Взаимно!",
  "feed.matchDesc": "тоже хочет обменяться!",
  "feed.continueBrowsing": "Продолжить просмотр",
  "feed.emptyHint": "Вещи закончились. Загляните позже - появятся новые предложения.",
  "feed.viewMatches": "Посмотреть совпадения",
  "start.uploadYourItem": "Загрузить свою вещь",
  "create.hint": "5-15 сек, покажите со всех сторон",
  "create.step": "Шаг",
  "create.uploadVideo": "Загрузите видео вещи",
  "create.recordVideo": "Записать видео",
  "create.fromGallery": "из галереи",
  "create.uploadFromGallery": "Загрузить из галереи",
  "create.descriptionPlaceholder": "Состояние, комплектация, дефекты...",
  "match.statusCompleted": "Контакт открыт",
  "match.statusPending": "Ожидает оплаты",
  "match.statusPaidYou": "Вы оплатили",
  "match.statusPaidOther": "Другая сторона оплатила",
  "match.statusExpired": "Срок истек",
  "match.conditionNew": "Новый",
  "match.conditionLikeNew": "Как новый",
  "match.conditionGood": "Хороший",
  "match.conditionFair": "Средний",
  "liked.itemsCount": "шт.",
  "liked.chosenBy": "выбрали",
  "liked.selectedForTrade": "Меняю на это",
  "liked.iWantToTrade": "Хочу обменяться",
  "liked.remove": "Убрать",
  "liked.backToFeed": "Смотреть ленту",
  "liked.tradingDesc": "Эти люди хотят обменяться с вами! Каждый указал, что готов отдать за вашу вещь.",
  "liked.noOnePickedDesc": "Вас пока никто не выбрал. Загрузите вещь, чтобы другие могли вас выбрать.",
  "liked.emptyDesc": "Свайпайте вправо на вещи, которые понравились - и они появятся здесь",
  "payment.cost": "Стоимость открытия:",
  "payment.chatHint": "Нажмите кнопку ниже, чтобы открыть чат",
  "payment.ownerUsername": "@имя_владельца",
  "pro.subscription": "PRO подписка",
  "pro.subscribePrice": "Стать PRO за $10/мес",
  "common.noCategory": "В этой категории пока нет вещей",
  "common.cameraError": "Не удалось получить доступ к камере.",
  "common.videoTooBig": "Видео слишком большое. Загрузите до 50MB.",
'''

new_uk = '''  "feed.showAll": "Показати всі",
  "feed.itsAMatch": "Взаємно!",
  "feed.matchDesc": "теж хоче обмінятись!",
  "feed.continueBrowsing": "Продовжити перегляд",
  "feed.emptyHint": "Речі закінчились. Загляньте пізніше - з'являться нові пропозиції.",
  "feed.viewMatches": "Подивитись збіги",
  "start.uploadYourItem": "Завантажити свою річ",
  "create.hint": "5-15 сек, покажіть з усіх боків",
  "create.step": "Крок",
  "create.uploadVideo": "Завантажте відео речі",
  "create.recordVideo": "Записати відео",
  "create.fromGallery": "з галереї",
  "create.uploadFromGallery": "Завантажити з галереї",
  "create.descriptionPlaceholder": "Стан, комплектація, дефекти...",
  "match.statusCompleted": "Контакт відкрито",
  "match.statusPending": "Очікує оплати",
  "match.statusPaidYou": "Ви оплатили",
  "match.statusPaidOther": "Інша сторона оплатила",
  "match.statusExpired": "Термін минув",
  "match.conditionNew": "Новий",
  "match.conditionLikeNew": "Як новий",
  "match.conditionGood": "Хороший",
  "match.conditionFair": "Середній",
  "liked.itemsCount": "шт.",
  "liked.chosenBy": "обрали",
  "liked.selectedForTrade": "Міняю на це",
  "liked.iWantToTrade": "Хочу обмінятись",
  "liked.remove": "Прибрати",
  "liked.backToFeed": "Дивитись стрічку",
  "liked.tradingDesc": "Ці люди хочуть обмінятися з вами! Кожен вказав, що готовий віддати за вашу річ.",
  "liked.noOnePickedDesc": "Вас поки що ніхто не обрав. Завантажте річ, щоб інші могли вас обрати.",
  "liked.emptyDesc": "Свайпайте вправо на речі, які сподобались - і вони з'являться тут",
  "payment.cost": "Вартість відкриття:",
  "payment.chatHint": "Натисніть кнопку нижче, щоб відкрити чат",
  "payment.ownerUsername": "@ім'я_власника",
  "pro.subscription": "PRO підписка",
  "pro.subscribePrice": "Стати PRO за $10/міс",
  "common.noCategory": "У цій категорії поки немає речей",
  "common.cameraError": "Не вдалося отримати доступ до камери.",
  "common.videoTooBig": "Відео занадто велике. Завантажте до 50MB.",
'''

# Demo items for EN, RU, UK
demo_titles_en = [
    "Laptop", "Smartphone", "Wireless Headphones", "Sneakers", "Wrist Watch",
    "Digital Camera", "Portable Speaker", "Tablet", "Sunglasses", "Cap",
    "Stuffed Bear", "Bicycle", "Perfume", "Office Chair", "Acoustic Guitar",
    "Dumbbells", "Silver Ring", "Backpack", "Leather Jacket", "Bracelet",
]
demo_descs_en = [
    "Working laptop, 15.6 inch screen, fast, for work and study.",
    "Touch screen, unlocked, all networks work.",
    "Bluetooth 5.2, active noise cancellation, 30h battery.",
    "Size 43, breathable mesh, comfortable sole, lightly worn.",
    "Classic design, leather strap, working mechanism.",
    "Full HD video, 20 MP, includes memory card.",
    "Bluetooth 5.0, waterproof, deep bass, 12h playback.",
    "10 inch touch screen, Wi-Fi, great for video and reading.",
    "Polarized lenses, UV protection, lightweight frame.",
    "Cotton, adjustable, one size fits all, excellent condition.",
    "Large teddy bear, 80 cm tall, hypoallergenic filling.",
    "Mountain bike, 26 wheels, 21 speed, working.",
    "Eau de toilette, 100 ml, oriental scent, sealed.",
    "Adjustable height, ergonomic back support.",
    "6-string, wooden, includes case, great sound.",
    "Set of dumbbells, 2 x 5 kg, comfortable grip.",
    "925 silver, size 17, with gemstone.",
    "Spacious 40L backpack, waterproof, many compartments.",
    "Genuine leather, size L, intact lining, working zipper.",
    "Leather bracelet with metal insert, one size.",
]

demo_lines_en = '\n'.join(f'  "demo.{i}.title": "{demo_titles_en[i]}",\n  "demo.{i}.desc": "{demo_descs_en[i]}",' for i in range(20))

# We'll insert each language section's new keys after its opening brace
# Find the position after each "{lang_code" opening

def insert_after_opening(content, lang_code, new_lines):
    """Insert new lines right after the opening brace of a language section."""
    # Find: "\n  "{lang_code}": {\n"
    pattern = f'\n  "{lang_code}": {{'
    pos = content.find(pattern)
    if pos == -1:
        print(f"  WARNING: Section '{lang_code}' not found!")
        return content
    
    # Find the position after the { and newline
    after_brace = content.find('\n', pos + len(pattern) - 1) + 1
    
    # Check if followed by a comment line or directly by first key
    first_char = content[after_brace:after_brace+1]
    
    # Insert before the first key
    content = content[:after_brace] + new_lines + '\n' + content[after_brace:]
    print(f"  Inserted into '{lang_code}': {len(new_lines.split(chr(10)))} lines")
    return content

print("Inserting keys into English section...")
content = insert_after_opening(content, 'en', new_en)

print("Inserting keys into Russian section...")
content = insert_after_opening(content, 'ru', new_ru)

print("Inserting keys into Ukrainian section...")
content = insert_after_opening(content, 'uk', new_uk)

# Add demo.* keys to EN, RU, UK
demo_ru = demo_lines_en.replace('Wireless Headphones', 'Беспроводные наушники').replace('Laptop', 'Ноутбук').replace('Smartphone', 'Смартфон')
demo_uk = demo_lines_en.replace('Laptop', 'Ноутбук').replace('Smartphone', 'Смартфон').replace('Wireless Headphones', 'Бездротові навушники').replace('Sneakers', 'Кросівки').replace('Wrist Watch', 'Годинник').replace('Digital Camera', 'Камера').replace('Portable Speaker', 'Колонка').replace('Tablet', 'Планшет').replace('Sunglasses', 'Окуляри').replace('Cap', 'Кепка').replace('Stuffed Bear', 'Ведмідь').replace('Bicycle', 'Велосипед').replace('Perfume', 'Парфуми').replace('Office Chair', 'Крісло').replace('Acoustic Guitar', 'Гітара').replace('Dumbbells', 'Гантелі').replace('Silver Ring', 'Кільце').replace('Backpack', 'Рюкзак').replace('Leather Jacket', 'Куртка').replace('Bracelet', 'Браслет')

# For demo.* we use a simplified approach - only add English ones (others will fallback)
# Actually, let's just add English demo keys first
print("Inserting demo keys into English section...")
content = insert_after_opening(content, 'en', demo_lines_en + '\n')

# Demo RU with basic translations
demo_lines_ru = demo_lines_en  # Simplified - just English for now
print("Inserting demo keys into Russian section...")
content = insert_after_opening(content, 'ru', demo_lines_ru + '\n')

# Demo UK  
print("Inserting demo keys into Ukrainian section...")
content = insert_after_opening(content, 'uk', demo_uk + '\n')

with open(PATH, 'w') as f:
    f.write(content)

print(f"\nDone! File: {len(content)} bytes")
print(f"Total lines: {content.count(chr(10))}")
PYEOF
