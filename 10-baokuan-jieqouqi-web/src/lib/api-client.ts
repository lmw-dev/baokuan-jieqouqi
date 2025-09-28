async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 修复URL拼接逻辑：如果endpoint已经以/api开头，就直接使用，否则添加/api前缀
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  console.log('🌐 api-client.request 被调用')
  console.log('原始endpoint:', endpoint)
  console.log('处理后URL:', url)
  console.log('请求选项:', options)
  
  const headers = new Headers(options.headers || {});
  // You might want to add auth headers here if needed, e.g.:
  // const session = await getSession();
  // if (session?.accessToken) {
  //   headers.append('Authorization', `Bearer ${session.accessToken}`);
  // }

  console.log('📡 发送fetch请求...')
  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log('📨 收到fetch响应:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    url: response.url
  })

  if (!response.ok) {
    console.error('❌ fetch响应不成功，解析错误详情...')
    let errorDetails;
    try {
        errorDetails = await response.json();
        console.error('错误详情:', errorDetails)
    } catch (e) {
        errorDetails = { message: response.statusText };
        console.error('无法解析错误详情，使用默认错误:', errorDetails)
    }
    throw new Error(errorDetails.message || 'API request failed');
  }
  
  // Handle cases with no content
  if (response.status === 204) {
    console.log('📭 响应状态204，返回null')
    return null as T;
  }

  console.log('📦 解析响应JSON...')
  const result = await response.json();
  console.log('✅ 解析结果:', result)
  return result;
}

const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'GET',
    })
  },
  async post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    })
  },
  async put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(body),
    })
  },
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    })
  },
}

export default apiClient;