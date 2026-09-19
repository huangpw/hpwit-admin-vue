<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { fetchCaptcha } from '@/service/index'

const emit = defineEmits(['update:modelValue'])
function toLogin() {
  emit('update:modelValue', 'login')
}
const { t } = useI18n()

const rules = {
  account: {
    required: true,
    trigger: 'blur',
    message: t('login.accountRuleTip'),
  },
  pwd: {
    required: true,
    trigger: 'blur',
    message: t('login.passwordRuleTip'),
  },
  rePwd: {
    required: true,
    trigger: 'blur',
    message: t('login.checkPasswordRuleTip'),
  },
  captchaCode: {
    required: true,
    trigger: 'blur',
    message: t('login.captchaRuleTip'),
  },
}
const formValue = ref({
  account: 'admin',
  pwd: '000000',
  rePwd: '000000',
  captchaCode: '',
})
const captchaKey = ref('')
const captchaImg = ref('')
const isRead = ref(false)

/** 加载图形验证码 */
async function loadCaptcha() {
  captchaKey.value = ''
  captchaImg.value = ''
  formValue.value.captchaCode = ''
  try {
    const { isSuccess, data } = await fetchCaptcha()
    if (!isSuccess || !data)
      return

    captchaKey.value = data.key
    captchaImg.value = data.img
  }
  catch (e) {
    console.warn('[loadCaptcha Error]:', e)
  }
}

function handleRegister() {}

onMounted(() => {
  loadCaptcha()
})
</script>

<template>
  <div>
    <n-h2 depth="3" class="text-center">
      {{ $t('login.registerTitle') }}
    </n-h2>
    <n-form
      :rules="rules"
      :model="formValue"
      :show-label="false"
      size="large"
    >
      <n-form-item path="account">
        <n-input
          v-model:value="formValue.account"
          clearable
          :placeholder="$t('login.accountPlaceholder')"
          :input-props="{ autocomplete: 'username' }"
        />
      </n-form-item>
      <n-form-item path="pwd">
        <n-input
          v-model:value="formValue.pwd"
          type="password"
          :placeholder="$t('login.passwordPlaceholder')"
          clearable
          show-password-on="click"
          :input-props="{ autocomplete: 'new-password' }"
        >
          <template #password-invisible-icon>
            <icon-park-outline-preview-close-one />
          </template>
          <template #password-visible-icon>
            <icon-park-outline-preview-open />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item path="rePwd">
        <n-input
          v-model:value="formValue.rePwd"
          type="password"
          :placeholder="$t('login.checkPasswordPlaceholder')"
          clearable
          show-password-on="click"
          :input-props="{ autocomplete: 'new-password' }"
        >
          <template #password-invisible-icon>
            <icon-park-outline-preview-close-one />
          </template>
          <template #password-visible-icon>
            <icon-park-outline-preview-open />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item path="captchaCode">
        <n-flex :size="12" :wrap="false" class="w-full">
          <n-input
            v-model:value="formValue.captchaCode"
            :placeholder="$t('login.captchaPlaceholder')"
            maxlength="4"
            clearable
            class="flex-1"
          />
          <n-image
            :src="captchaImg"
            :alt="$t('login.captchaAlt')"
            width="130"
            height="40"
            object-fit="contain"
            preview-disabled
            class="captcha-img"
            @click="loadCaptcha"
          />
        </n-flex>
      </n-form-item>
      <n-form-item>
        <n-space
          vertical
          :size="20"
          class="w-full"
        >
          <n-checkbox v-model:checked="isRead">
            {{ $t('login.readAndAgree') }} <n-button
              type="primary"
              text
            >
              {{ $t('login.userAgreement') }}
            </n-button>
          </n-checkbox>
          <n-button
            block
            type="primary"
            @click="handleRegister"
          >
            {{ $t('login.signUp') }}
          </n-button>
          <n-flex justify="center">
            <n-text>{{ $t('login.haveAccountText') }}</n-text>
            <n-button
              text
              type="primary"
              @click="toLogin"
            >
              {{ $t('login.signIn') }}
            </n-button>
          </n-flex>
        </n-space>
      </n-form-item>
    </n-form>
  </div>
</template>

<style scoped>
.captcha-img {
  cursor: pointer;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background-color: #f5f5f5;
  user-select: none;
  flex-shrink: 0;
}
</style>
