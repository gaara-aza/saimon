const { Telegraf } = require('telegraf');
const User = require('../models/User');

class TelegramBot {
    constructor() {
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.warn('TELEGRAM_BOT_TOKEN не установлен. Бот не будет запущен.');
            return;
        }

        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.setupCommands();
        this.setupHandlers();
    }

    setupCommands() {
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
            const user = await User.findOne({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (user) {
                ctx.reply(`Ваш аккаунт привязан к номеру: ${user.phone}`);
            } else {
                ctx.reply('Ваш аккаунт не привязан к номеру телефона');
            }
        });

        this.bot.command('unlink', async (ctx) => {
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
        });
    }

    setupHandlers() {
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
                console.error('Ошибка при привязке номера:', error);
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
    }

    // Метод для отправки кода подтверждения
    async sendVerificationCode(phone, code) {
        try {
            const user = await User.findOne({ 
                where: { phone, telegramId: { [Op.not]: null } }
            });

            if (!user || !user.telegramId) {
                throw new Error('Telegram ID не найден');
            }

            await this.bot.telegram.sendMessage(
                user.telegramId,
                `Ваш код подтверждения: ${code}\n\n` +
                'Никому не сообщайте этот код!'
            );

            return true;
        } catch (error) {
            console.error('Ошибка отправки кода в Telegram:', error);
            return false;
        }
    }

    // Запуск бота
    launch() {
        if (this.bot) {
            this.bot.launch()
                .then(() => console.log('Telegram бот запущен'))
                .catch(error => console.error('Ошибка запуска бота:', error));
            
            // Включаем graceful shutdown
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        }
    }
}

// Создаем и экспортируем единственный экземпляр бота
const telegramBot = new TelegramBot();
module.exports = telegramBot; 