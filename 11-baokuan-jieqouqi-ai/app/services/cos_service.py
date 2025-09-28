import asyncio
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
from loguru import logger

from qcloud_cos import CosConfig
from qcloud_cos import CosS3Client
from qcloud_cos.cos_exception import CosServiceError, CosClientError

from app.core.config import settings


class COSService:
    """腾讯云COS存储服务"""
    
    def __init__(self):
        # 配置COS客户端
        config = CosConfig(
            Region=settings.cos_region,
            SecretId=settings.tencent_secret_id,
            SecretKey=settings.tencent_secret_key,
            Scheme='https'
        )
        
        self.client = CosS3Client(config)
        self.bucket_name = settings.cos_bucket_name
        self.region = settings.cos_region
        
        logger.info(f"COS服务初始化完成，存储桶: {self.bucket_name}, 区域: {self.region}")
    
    async def upload_file(
        self, 
        file_data: bytes, 
        file_key: str,
        content_type: Optional[str] = None
    ) -> str:
        """
        上传文件到COS
        
        Args:
            file_data: 文件二进制数据
            file_key: 文件在COS中的键名
            content_type: 文件MIME类型
            
        Returns:
            str: 文件的访问URL
            
        Raises:
            RuntimeError: 上传失败
        """
        try:
            logger.info(f"开始上传文件到COS: {file_key}")
            
            # 构建上传参数
            upload_params = {
                'Bucket': self.bucket_name,
                'Key': file_key,
                'Body': file_data
            }
            
            if content_type:
                upload_params['ContentType'] = content_type
            
            # 执行上传
            response = await asyncio.get_event_loop().run_in_executor(
                None, self._upload_sync, upload_params
            )
            
            # 获取文件URL
            file_url = self.get_file_url(file_key)
            
            logger.info(f"文件上传成功: {file_url}")
            return file_url
            
        except (CosServiceError, CosClientError) as e:
            error_msg = f"COS上传失败: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = f"文件上传异常: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def _upload_sync(self, upload_params: Dict[str, Any]) -> Dict[str, Any]:
        """同步上传方法"""
        return self.client.put_object(**upload_params)
    
    async def upload_file_from_path(
        self, 
        local_file_path: str, 
        file_key: str,
        content_type: Optional[str] = None
    ) -> str:
        """
        从本地路径上传文件
        
        Args:
            local_file_path: 本地文件路径
            file_key: 文件在COS中的键名
            content_type: 文件MIME类型
            
        Returns:
            str: 文件的访问URL
        """
        try:
            # 读取文件内容
            with open(local_file_path, 'rb') as f:
                file_data = f.read()
            
            # 如果没有指定content_type，尝试从文件扩展名推断
            if not content_type:
                content_type = self._guess_content_type(local_file_path)
            
            return await self.upload_file(file_data, file_key, content_type)
            
        except FileNotFoundError:
            raise RuntimeError(f"本地文件不存在: {local_file_path}")
        except Exception as e:
            raise RuntimeError(f"从路径上传文件失败: {str(e)}")
    
    def get_file_url(self, file_key: str) -> str:
        """
        获取文件的访问URL
        
        Args:
            file_key: 文件键名
            
        Returns:
            str: 文件访问URL
        """
        if settings.cos_domain:
            # 使用自定义域名
            return f"https://{settings.cos_domain}/{file_key}"
        else:
            # 使用默认域名
            return f"https://{self.bucket_name}.cos.{self.region}.myqcloud.com/{file_key}"
    
    async def delete_file(self, file_key: str) -> bool:
        """
        删除COS中的文件
        
        Args:
            file_key: 文件键名
            
        Returns:
            bool: 是否删除成功
        """
        try:
            logger.info(f"删除COS文件: {file_key}")
            
            await asyncio.get_event_loop().run_in_executor(
                None, self._delete_sync, file_key
            )
            
            logger.info(f"文件删除成功: {file_key}")
            return True
            
        except (CosServiceError, CosClientError) as e:
            logger.error(f"COS删除失败: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"删除文件异常: {str(e)}")
            return False
    
    def _delete_sync(self, file_key: str) -> Dict[str, Any]:
        """同步删除方法"""
        return self.client.delete_object(
            Bucket=self.bucket_name,
            Key=file_key
        )
    
    async def download_file(self, file_key: str, local_dir: Optional[str] = None) -> Dict[str, Any]:
        """
        从COS下载文件到本地
        
        Args:
            file_key: COS中的文件键名
            local_dir: 本地目录，如果为None则使用临时目录
            
        Returns:
            Dict[str, Any]: 下载结果
                - success: bool, 是否成功
                - local_path: str, 本地文件路径（成功时）
                - error: str, 错误信息（失败时）
        """
        try:
            logger.info(f"开始从COS下载文件: {file_key}")
            
            # 确定本地存储目录
            if local_dir is None:
                import tempfile
                local_dir = tempfile.gettempdir()
            
            # 生成本地文件名
            local_filename = os.path.basename(file_key) or "downloaded_file"
            local_path = os.path.join(local_dir, local_filename)
            
            # 确保目录存在
            os.makedirs(local_dir, exist_ok=True)
            
            # 执行下载
            await asyncio.get_event_loop().run_in_executor(
                None, self._download_sync, file_key, local_path
            )
            
            # 验证文件是否下载成功
            if not os.path.exists(local_path):
                raise RuntimeError("下载完成但文件不存在")
            
            file_size = os.path.getsize(local_path)
            logger.info(f"文件下载成功: {local_path}, 大小: {file_size} bytes")
            
            return {
                "success": True,
                "local_path": local_path,
                "file_size": file_size
            }
            
        except (CosServiceError, CosClientError) as e:
            error_msg = f"COS下载失败: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            error_msg = f"文件下载异常: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }

    async def download_file_to_path(self, file_key: str, local_dir: Optional[str] = None) -> str:
        """
        从COS下载文件到本地，直接返回本地文件路径（优化版本）
        
        Args:
            file_key: COS中的文件键名
            local_dir: 本地目录，如果为None则使用临时目录
            
        Returns:
            str: 本地文件路径
            
        Raises:
            RuntimeError: 下载失败时抛出异常
        """
        try:
            logger.info(f"开始从COS下载文件: {file_key}")
            
            # 确定本地存储目录
            if local_dir is None:
                import tempfile
                local_dir = tempfile.gettempdir()
            
            # 生成本地文件名（添加时间戳避免冲突）
            import time
            timestamp = int(time.time())
            local_filename = f"{timestamp}_{os.path.basename(file_key) or 'downloaded_file'}"
            local_path = os.path.join(local_dir, local_filename)
            
            # 确保目录存在
            os.makedirs(local_dir, exist_ok=True)
            
            # 执行下载
            await asyncio.get_event_loop().run_in_executor(
                None, self._download_sync, file_key, local_path
            )
            
            # 验证文件是否下载成功
            if not os.path.exists(local_path):
                raise RuntimeError("下载完成但文件不存在")
            
            file_size = os.path.getsize(local_path)
            logger.info(f"文件下载成功: {local_path}, 大小: {file_size} bytes")
            
            return local_path
            
        except (CosServiceError, CosClientError) as e:
            error_msg = f"COS下载失败: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = f"文件下载异常: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def _download_sync(self, file_key: str, local_path: str) -> None:
        """同步下载方法"""
        response = self.client.get_object(
            Bucket=self.bucket_name,
            Key=file_key
        )
        
        # 将响应内容写入本地文件
        with open(local_path, 'wb') as f:
            for chunk in response['Body'].get_stream():
                f.write(chunk)
    
    async def file_exists(self, file_key: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            file_key: 文件键名
            
        Returns:
            bool: 文件是否存在
        """
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, self._head_object_sync, file_key
            )
            return True
        except (CosServiceError, CosClientError):
            return False
        except Exception:
            return False
    
    def _head_object_sync(self, file_key: str) -> Dict[str, Any]:
        """同步获取文件元数据方法"""
        return self.client.head_object(
            Bucket=self.bucket_name,
            Key=file_key
        )
    
    async def get_file_info(self, file_key: str) -> Optional[Dict[str, Any]]:
        """
        获取文件信息
        
        Args:
            file_key: 文件键名
            
        Returns:
            Optional[Dict]: 文件信息，None表示文件不存在
        """
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, self._head_object_sync, file_key
            )
            
            return {
                "file_key": file_key,
                "content_length": response.get('Content-Length', 0),
                "content_type": response.get('Content-Type', ''),
                "last_modified": response.get('Last-Modified', ''),
                "etag": response.get('ETag', ''),
                "url": self.get_file_url(file_key)
            }
            
        except Exception as e:
            logger.warning(f"获取文件信息失败: {file_key}, 错误: {str(e)}")
            return None
    
    def generate_file_key(
        self, 
        original_filename: str, 
        prefix: str = "analysis",
        add_timestamp: bool = True
    ) -> str:
        """
        生成文件键名
        
        Args:
            original_filename: 原始文件名
            prefix: 前缀
            add_timestamp: 是否添加时间戳
            
        Returns:
            str: 生成的文件键名
        """
        # 获取文件扩展名
        file_ext = Path(original_filename).suffix.lower()
        
        # 生成基础名称
        if add_timestamp:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = f"{timestamp}_{original_filename}"
        else:
            base_name = original_filename
        
        # 构建完整的键名
        file_key = f"{prefix}/{base_name}"
        
        # 确保键名安全（移除特殊字符）
        file_key = self._sanitize_file_key(file_key)
        
        return file_key
    
    def _sanitize_file_key(self, file_key: str) -> str:
        """
        清理文件键名，确保符合COS要求
        
        Args:
            file_key: 原始键名
            
        Returns:
            str: 清理后的键名
        """
        # 替换空格和特殊字符
        import re
        # 保留字母、数字、中文、点、斜杠、下划线、连字符
        sanitized = re.sub(r'[^\w\u4e00-\u9fff./\-]', '_', file_key)
        
        # 避免连续的斜杠
        sanitized = re.sub(r'/+', '/', sanitized)
        
        # 移除开头的斜杠
        sanitized = sanitized.lstrip('/')
        
        return sanitized
    
    def _guess_content_type(self, file_path: str) -> str:
        """
        根据文件扩展名推断MIME类型
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: MIME类型
        """
        extension = Path(file_path).suffix.lower()
        
        mime_types = {
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
        }
        
        return mime_types.get(extension, 'application/octet-stream')
    
    async def test_connection(self) -> bool:
        """
        测试COS连接
        
        Returns:
            bool: 连接是否成功
        """
        try:
            # 尝试列出存储桶（限制返回1个对象）
            await asyncio.get_event_loop().run_in_executor(
                None, self._list_objects_sync
            )
            
            logger.info("COS连接测试成功")
            return True
            
        except Exception as e:
            logger.error(f"COS连接测试失败: {str(e)}")
            return False
    
    def _list_objects_sync(self) -> Dict[str, Any]:
        """同步列出对象方法"""
        return self.client.list_objects(
            Bucket=self.bucket_name,
            MaxKeys=1
        )
    
    async def generate_download_url(self, file_key: str, expires: int = 3600) -> str:
        """
        生成带签名的下载URL
        
        Args:
            file_key: 文件键名
            expires: 过期时间（秒）
            
        Returns:
            str: 带签名的下载URL
        """
        try:
            # 使用COS SDK生成预签名URL
            url = await asyncio.get_event_loop().run_in_executor(
                None, self._generate_download_url_sync, file_key, expires
            )
            
            logger.info(f"生成下载URL成功: {file_key}")
            return url
            
        except Exception as e:
            logger.error(f"生成下载URL失败: {file_key}, 错误: {str(e)}")
            # 如果签名失败，返回公共URL（可能无法访问，但至少不会崩溃）
            return self.get_file_url(file_key)
    
    def _generate_download_url_sync(self, file_key: str, expires: int) -> str:
        """同步生成下载URL"""
        return self.client.get_presigned_download_url(
            Bucket=self.bucket_name,
            Key=file_key,
            Expired=expires
        )
    
    async def list_files(self, prefix: str = "", max_keys: int = 100) -> List[Dict[str, Any]]:
        """
        列出COS存储桶中的文件
        
        Args:
            prefix: 文件前缀过滤
            max_keys: 最大返回数量
            
        Returns:
            List[Dict]: 文件信息列表
        """
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, self._list_files_sync, prefix, max_keys
            )
            
            files = []
            
            # 解析响应中的文件信息
            contents = response.get('Contents', [])
            for obj in contents:
                files.append({
                    'key': obj.get('Key', ''),
                    'size': obj.get('Size', 0),
                    'last_modified': obj.get('LastModified', ''),
                    'etag': obj.get('ETag', ''),
                    'storage_class': obj.get('StorageClass', '')
                })
            
            logger.info(f"列出文件成功: 前缀={prefix}, 数量={len(files)}")
            return files
            
        except Exception as e:
            logger.error(f"列出文件失败: 前缀={prefix}, 错误: {str(e)}")
            return []
    
    def _list_files_sync(self, prefix: str, max_keys: int) -> Dict[str, Any]:
        """同步列出文件方法"""
        return self.client.list_objects(
            Bucket=self.bucket_name,
            Prefix=prefix,
            MaxKeys=max_keys
        )