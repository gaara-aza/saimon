const { Telegraf } = require('telegraf');
const User = require('../models/User');
const { Op } = require('sequelize');

class TelegramBot {
    constructor() {
        // Проверяем наличие токена
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.warn('TELEGRAM_BOT_TOKEN не установлен. Бот не будет запущен.');
            this.bot = null;
            return;
        }

        try {
            this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
            this.setupCommands();
            this.setupHandlers();
            console.log('TelegramBot: Инициализация успешна');
        } catch (error) {
            console.error('TelegramBot: Ошибка инициализации:', error.message);
            this.bot = null;
        }
    }

    setupCommands() {
        if (!this.bot) return;

        try {
            this.bot.command('start', async (ctx) => {
                const message = 'Привет! Я бот для аутентификации в Football Manager.\n' +
                              'Для связки аккаунта, пожалуйста, отправьте свой номер телефона ' +
                              'через кнопку ниже.';

                await ctx.reply(message, {
                    reply_markup: {
                        keyboard: [[{
                            text: '📱 Отправить номер телефона',
                            request_contact: true
                        }]],
                        resize_keyboard: true
                    }
                });
            });

            this.bot.command('help', (ctx) => {
                ctx.reply(
                    'Доступные команды:\n' +
                    '/start - Начать процесс привязки номера телефона\n' +
                    '/status - Проверить статус привязки\n' +
                    '/unlink - Отвязать номер телефона'
                );
            });

            this.bot.command('status', async (ctx) => {
                try {
                    const user = await User.findOne({
                        where: { telegramId: ctx.from.id.toString() }
                    });

                    if (user) {
                        ctx.reply(`Ваш аккаунт привязан к номеру: ${user.phone}`);
                    } else {
                        ctx.reply('Ваш аккаунт не привязан к номеру телефона');
                    }
                } catch (error) {
                    console.error('TelegramBot: Ошибка в команде status:', error.message);
                    ctx.reply('Произошла ошибка при проверке статуса. Попробуйте позже.');
                }
            });

            this.bot.command('unlink', async (ctx) => {
                try {
                    const user = await User.findOne({
                        where: { telegramId: ctx.from.id.toString() }
                    });

                    if (user) {
                        user.telegramId = null;
                        await user.save();
                        ctx.reply('Ваш аккаунт успешно отвязан');
                    } else {
                        ctx.reply('Ваш аккаунт не был привязан');
                    }
                } catch (error) {
                    console.error('TelegramBot: Ошибка в команде unlink:', error.message);
                    ctx.reply('Произошла ошибка при отвязке аккаунта. Попробуйте позже.');
                }
            });
        } catch (error) {
            console.error('TelegramBot: Ошибка при настройке команд:', error.message);
        }
    }

    setupHandlers() {
        if (!this.bot) return;

        try {
            // Обработка отправки контакта (номера телефона)
            this.bot.on('contact', async (ctx) => {
                const contact = ctx.message.contact;
                
                // Проверяем, что контакт принадлежит отправителю
                if (contact.user_id !== ctx.from.id) {
                    return ctx.reply('Пожалуйста, отправьте свой собственный номер телефона');
                }

                try {
                    // Форматируем номер телефона
                    let phone = contact.phone_number;
                    if (!phone.startsWith('+')) {
                        phone = '+' + phone;
                    }

                    // Ищем пользователя по номеру телефона
                    const user = await User.findOne({ where: { phone } });

                    if (user) {
                        // Привязываем Telegram ID к пользователю
                        user.telegramId = ctx.from.id.toString();
                        await user.save();

                        await ctx.reply(
                            '✅ Ваш номер телефона успешно привязан к аккаунту!\n' +
                            'Теперь вы будете получать коды подтверждения в этот чат.'
                        );
                    } else {
                        await ctx.reply(
                            '❌ Пользователь с таким номером телефона не найден.\n' +
                            'Сначала зарегистрируйтесь на сайте.'
                        );
                    }
                } catch (error) {
                    console.error('TelegramBot: Ошибка при привязке номера:', error.message);
                    await ctx.reply('Произошла ошибка при привязке номера. Попробуйте позже.');
                }
            });

            // Обработка всех остальных сообщений
            this.bot.on('message', (ctx) => {
                ctx.reply(
                    'Для привязки номера телефона используйте команду /start\n' +
                    'Для просмотра всех команд используйте /help'
                );
            });
        } catch (error) {
            console.error('TelegramBot: Ошибка при настройке обработчиков:', error.message);
        }
    }

    // Метод для отправки кода подтверждения
    async sendVerificationCode(phone, code) {
        if (!this.bot) {
            console.warn('TelegramBot: Бот не инициализирован, невозможно отправить код');
            return false;
        }

        try {
            const user = await User.findOne({ 
                where: { phone, telegramId: { [Op.not]: null } }
            });

            if (!user || !user.telegramId) {
                console.warn(`TelegramBot: Telegram ID не найден для номера ${phone}`);
                return false;
            }

            await this.bot.telegram.sendMessage(
                user.telegramId,
                `Ваш код подтверждения: ${code}\n\n` +
                'Никому не сообщайте этот код!'
            );

            console.log(`TelegramBot: Код подтверждения отправлен пользователю с ID ${user.telegramId}`);
            return true;
        } catch (error) {
            console.error('TelegramBot: Ошибка отправки кода в Telegram:', error.message);
            return false;
        }
    }

    // Запуск бота
    launch() {
        if (!this.bot) {
            console.warn('TelegramBot: Бот не инициализирован, невозможно запустить');
            return false;
        }

        try {
            this.bot.launch()
                .then(() => console.log('TelegramBot: Бот успешно запущен'))
                .catch(error => console.error('TelegramBot: Ошибка запуска бота:', error.message));
            
            // Включаем graceful shutdown
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
            
            return true;
        } catch (error) {
            console.error('TelegramBot: Критическая ошибка при запуске бота:', error.message);
            return false;
        }
    }
}

// Создаем и экспортируем единственный экземпляр бота
const telegramBot = new TelegramBot();
module.exports = telegramBot; 