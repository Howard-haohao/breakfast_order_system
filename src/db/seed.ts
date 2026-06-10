import { db } from './index';
import { cartItems, menuItems, orderItems, orders } from './schema';

async function seed() {
  console.log('Resetting sample breakfast data...');

  await db.delete(cartItems);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(menuItems);

  await db.insert(menuItems).values([
    {
      name: '厚切豬排蛋吐司',
      price: 85,
      category: '吐司',
      description: '厚切豬排、半熟蛋與花生醬的高飽足組合。',
      imageUrl:
        'https://www.foodnext.net/dispPageBox/getFile/GetImg.aspx?FileLocation=%2FPJ-FOODNEXT%2FFiles%2F&FileName=photo-05096-i.jpg',
    },
    {
      name: '薯餅蛋餅',
      price: 55,
      category: '蛋餅',
      description: '酥脆薯餅包進蛋餅，口感紮實。',
      imageUrl:
        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
    },
    {
      name: '招牌蘿蔔糕',
      price: 40,
      category: '點心',
      description: '外酥內軟，適合搭配蒜蓉醬油。',
      imageUrl:
        'https://images.unsplash.com/photo-1605333396915-47ed6b68a00e?w=800&q=80',
    },
    {
      name: '冰美式咖啡',
      price: 35,
      category: '飲料',
      description: '清爽順口，適合晨間提神。',
      imageUrl: 'https://estarfood.com/wp-content/uploads/2021/05/E21-1.jpg',
    },
  ]);

  console.log('Seed completed.');
  process.exit(0);
}

void seed();
