import { useBoolean } from '@/hooks';

const { bool: spin, setTrue: startSpin, setFalse: endSpin } = useBoolean();

/**
 * 通用异步执行函数
 * @param apiCall API调用函数
 * @param onSuccess 成功回调
 * @param message 成功消息
 */
async function executeAsync<T>(
  apiCall: () => Promise<T>,
  onSuccess?: (data: T) => void | Promise<void>,
  message: string | null = '操作成功',
) {
  try {
    startSpin();
    const data = await apiCall();

    if (message) {
      window.$message.success(message);
    }
    if (onSuccess) {
      await onSuccess(data);
    }

    return data;
  } catch (error) {
    console.error(error);

    return null;
  } finally {
    endSpin();
  }
}

export { endSpin, executeAsync, spin, startSpin };
