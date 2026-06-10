import { db } from './index';
import { menuItems } from './schema';

async function seed() {
  console.log('🚗 技師正在將補給品搬上貨架...');
  
  await db.insert(menuItems).values([
    { 
      name: '馬丁女武神總匯', 
      price: 85, 
      category: '漢堡/吐司', 
      description: '極速補充體力，內含雙層牛肉與特製起司', 
      imageUrl: '' 
    },
    { 
      name: '氮氣大冰奶', 
      price: 30, 
      category: '飲品', 
      description: '一喝就加速，早晨清腸胃必備', 
      imageUrl: '' 
    },
    { 
      name: '碳纖維蘿蔔糕', 
      price: 40, 
      category: '單點', 
      description: '輕量化又飽足，外酥內嫩', 
      imageUrl: '' 
    }
  ]);

  console.log('🏁 補給品上架完成！');
  process.exit(0);
}

seed();